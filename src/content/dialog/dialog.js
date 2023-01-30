/* global REGISTER_DISABLED */
import browser from 'webextension-polyfill'
import {render, html} from 'lit-html'
import {classMap} from 'lit-html/directives/class-map.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import {repeat} from 'lit-html/directives/repeat.js'

import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import fuzzySearch from '../search.js'
import {autocomplete, getSelectedWord, getSelection, getEventTarget} from '../autocomplete.js'
import {keybind, keyunbind} from '../keybind.js'

import config from '../../config.js'
import {editIcon, plusIcon} from './dialog-icons.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'
export const dialogTagName = `b-dialog-${Date.now()}`

const dialogVisibleAttr = 'visible'
const openAnimationClass = 'b-dialog-open-animation'
const activeTemplateClass = 'active'

// action.openPopup is not supported in all browsers yet.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/openPopup
// Open the action popup in a new tab.
const popupUrl = browser.runtime.getURL('popup/popup.html')
const signupUrl = `${config.websiteUrl}/signup`

const template = document.createElement('template')
function plainText (html = '') {
  template.innerHTML = html
  return (template.content.textContent || '').replace(/\s+/g, ' ').trim()
}

customElements.define(
  dialogTagName,
  class extends HTMLElement {
    constructor () {
      super()
      // templates filtered
      this.templates = []
      // selected template
      this.activeItem = null
      // loading state
      this.loading = true

      this.searchField = null
      this.editor = null
      this.word = null
      // selection cache, to restore later
      this.focusNode = null
      this.focusOffset = 0
      this.anchorNode = null
      this.anchorOffset = 0

      this.show = (e) => {
        // dialog is already visible
        if (this.hasAttribute(dialogVisibleAttr)) {
          return
        }

        let target
        let removeCaretParent = false
        let placement = 'top-left'

        let element = getEventTarget(e)

        // detect rtl
        const targetStyle = window.getComputedStyle(element)
        const direction = targetStyle.direction || 'ltr'
        this.setAttribute('dir', direction)

        this.anchorNode = null
        this.anchorOffset = 0
        this.focusNode = null
        this.focusOffset = 0

        if (isTextfield(element)) {
          // input, textarea
          target = getEditableCaret(element)
          removeCaretParent = true
          if (direction === 'rtl') {
            placement = 'bottom-left-flip'
          } else {
            placement = 'bottom-right'
          }
        } else if (isContentEditable(element)) {
          // contenteditable
          target = getContentEditableCaret(element)

          // only use the targetMetrics width when caret is a range.
          // workaround for when the contenteditable caret is the endContainer.
          const isRange = target instanceof Range

          if (direction === 'rtl') {
            if (isRange) {
              placement = 'bottom-left-flip'
            } else {
              placement = 'top-right-flip'
            }
          } else {
            if (isRange) {
              placement = 'bottom-right'
            } else {
              placement = 'top-left'
            }
          }
        } else if (e.target.tagName.toLowerCase() === bubbleTagName) {
          // bubble
          target = e.target
          if (direction === 'rtl') {
            placement = 'bottom-left'
          } else {
            placement = 'bottom-right-flip'
          }
        } else {
          return
        }

        // prevent capturing keystrokes by the parent
        e.stopPropagation()
        e.preventDefault()

        // cache selection details, to restore later
        const selection = getSelection(element)
        this.anchorNode = selection.anchorNode
        this.anchorOffset = selection.anchorOffset
        this.focusNode = selection.focusNode
        this.focusOffset = selection.focusOffset

        // cache editor,
        // to use for inserting templates or restoring later.
        this.editor = document.activeElement
        // support having the activeElement inside a shadow root
        if (this.editor.shadowRoot) {
          this.editor = this.editor.shadowRoot.activeElement
        }

        this.word = getSelectedWord({
          element: this.editor
        })

        this.setAttribute(dialogVisibleAttr, true)
        const position = getDialogPosition(target, this, placement)
        this.style.top = `${position.top}px`
        this.style.left = `${position.left}px`

        // clean-up the virtual caret mirror,
        // used on input and textarea
        if (removeCaretParent) {
          target.parentNode.remove()
        }

        // set or clear the search query when first showing the dialog.
        // support for the data-briskine-search attribute.
        // setting the attribute on the editable element will set it's value in the search field.
        const searchQuery = element.getAttribute('data-briskine-search') || ''
        this.searchField.value = searchQuery
        // give it a second before focusing.
        // in production, the search field is not focused on some websites (eg. google sheets, salesfoce).
        setTimeout(() => {
          this.searchField.focus()
        })

        // populate the template list
        window.requestAnimationFrame(() => {
          this.populateTemplates(searchQuery)
        })
      }

      this.hideOnClick = (e) => {
        if (
          // clicking inside the dialog
          !this.contains(e.target) &&
          this.hasAttribute(dialogVisibleAttr) &&
          // clicking the bubble
          e.target.tagName.toLowerCase() !== bubbleTagName
        ) {
          this.removeAttribute(dialogVisibleAttr)
        }
      }

      this.filterTemplates = (templates = [], query = '') => {
        return store.getExtensionData()
          .then((data) => {
            const lastUsed = data.templatesLastUsed

            let filteredTemplates = templates
            if (query) {
              filteredTemplates = fuzzySearch(templates, query)
            } else {
              // only sort templates if no search query was used
              if (this.getAttribute('sort-az') === 'true') {
                // alphabetical sort
                filteredTemplates = filteredTemplates
                  .sort((a, b) => {
                    return a.title.localeCompare(b.title)
                  })
              } else {
                // default sort
                filteredTemplates = filteredTemplates
                  .sort((a, b) => {
                    return new Date(b.updated_datetime) - new Date(a.updated_datetime)
                  })
                  .sort((a, b) => {
                    return new Date(lastUsed[b.id] || 0) - new Date(lastUsed[a.id] || 0)
                  })
              }
            }

            return filteredTemplates
          })
      }

      this.getAllTemplates = () => {
        return store.getTemplates()
          .then((templates) => {
            this.loading = false
            return templates
          })
      }

      this.populateTemplates = (query = '') => {
        return this.getAllTemplates()
          .then((templates) => {
            return this.filterTemplates(templates, query)
          })
          .then((templates) => {
            this.templates = templates
            // set active item
            let active = null
            if (templates.length) {
              active = this.templates[0].id
            }

            // set active and scroll to top
            this.setActive(active)
            // scroll to top
            // using setActive is not reliable before re-rendering
            const list = this.shadowRoot.querySelector('.dialog-templates')
            if (list) {
              list.scrollTop = 0
            }
            this.render()
          })
      }

      this.setActive = (id = '', scrollIntoView = false) => {
        this.activeItem = id
        if (!this.activeItem) {
          return
        }

        // manually apply and remove active classes,
        // and relying on conditionally rendering the active class can get slow with large lists.
        const currentActive = this.shadowRoot.querySelector(`.${activeTemplateClass}`)
        if (currentActive) {
          currentActive.classList.remove(activeTemplateClass)
        }

        const newActive = this.shadowRoot.querySelector(`[data-id="${id}"]`)
        if (newActive) {
          newActive.classList.add(activeTemplateClass)
          if (scrollIntoView) {
            newActive.scrollIntoView({block: 'nearest'})
          }
        }
      }

      this.restoreSelection = () => {
        // only try to restore the selection on contenteditable.
        // input and textarea will restore the correct range with focus().
        if (
          isContentEditable(this.editor) &&
          this.anchorNode &&
          this.focusNode
        ) {
          window.getSelection().setBaseAndExtent(this.anchorNode, this.anchorOffset, this.focusNode, this.focusOffset)
        } else {
          this.editor.focus()
        }
      }

      this.insertTemplate = (id = '') => {
        this.restoreSelection()

        // get template from cache
        const template = this.templates.find((t) => t.id === id)

        autocomplete({
          quicktext: template,
          element: this.editor,
          word: this.word,
        })

        // close dialog
        this.removeAttribute(dialogVisibleAttr)
      }

      this.setAuthState = () => {
        store.getAccount()
          .then(() => {
            this.setAttribute('authenticated', 'true')
            return
          })
          .catch(() => {
            this.removeAttribute('authenticated')
            return
          })
          .then(() => {
            this.loading = true
            this.render()

            // only start loading the templates if the dialog is visible
            if (this.hasAttribute(dialogVisibleAttr)) {
              this.populateTemplates()
            }
          })
      }

      this.hideOnEsc = (e) => {
        if (e.key === 'Escape' && this.hasAttribute(dialogVisibleAttr)) {
          e.stopPropagation()
          // prevent triggering the keyup event on the page.
          // causes some websites (eg. linkedin) to also close the underlying modal
          // when closing our dialog.
          window.addEventListener('keyup', (e) => { e.stopPropagation() }, { capture: true, once: true })

          this.removeAttribute(dialogVisibleAttr)
          this.restoreSelection()
        }
      }

      this.handleSearchFieldShortcuts = (e) => {
        // only handle events from the search field
        const composedPath = e.composedPath()
        const composedTarget = composedPath[0]
        if (e.target !== this || composedTarget !== this.searchField) {
          return
        }

        const index = this.templates.findIndex((t) => t.id === this.activeItem)
        if (e.key === 'Enter') {
          e.preventDefault()
          return this.insertTemplate(this.activeItem)
        }

        let nextId
        if (e.key === 'ArrowDown' && this.templates[index + 1]) {
          nextId = this.templates[index + 1].id
        } else if (e.key === 'ArrowUp' && this.templates[index - 1]) {
          nextId = this.templates[index - 1].id
        }

        if (nextId) {
          e.preventDefault()
          this.setActive(nextId, true)
        }
      }

      const stopPropagation = (e, target) => {
        if (target && (this === target || this.shadowRoot.contains(target))) {
          e.stopPropagation()
        }
      }

      this.stopTargetPropagation = (e) => {
        stopPropagation(e, e.target)
      }

      this.stopRelatedTargetPropagation = (e) => {
        stopPropagation(e, e.relatedTarget)
      }
    }
    static get observedAttributes() { return ['visible'] }
    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'visible') {
        if (newValue === 'true') {
          // make sure we get the correct dialog size before animating
          setTimeout(() => {
            this.classList.add(openAnimationClass)
          })
        } else {
          this.classList.remove(openAnimationClass)
        }
      }
    }
    connectedCallback () {
      if (!this.isConnected) {
        return
      }

      this.attachShadow({mode: 'open'})
      this.render()

      // check authentication state
      this.setAuthState()
      store.on('login', this.setAuthState)
      store.on('logout', this.setAuthState)

      let searchDebouncer
      this.searchField = this.shadowRoot.querySelector('input[type=search]')
      // search for templates
      this.searchField.addEventListener('input', (e) => {
        if (searchDebouncer) {
          clearTimeout(searchDebouncer)
        }

        const query = e.target.value
        searchDebouncer = setTimeout(() => {
          this.populateTemplates(query)
        }, 200)
      })

      // keyboard navigation and insert for templates
      window.addEventListener('keydown', this.handleSearchFieldShortcuts, true)

      // hover templates
      this.shadowRoot.addEventListener('mouseover', (e) => {
        const container = e.target.closest('[data-id]')
        if (container) {
          this.setActive(container.dataset.id)
        }
      })

      // insert templates on click
      this.shadowRoot.addEventListener('click', (e) => {
        const container = e.target.closest('[data-id]')
        // prevent inserting templates when clicking the edit button
        const editButton = e.target.closest('.template-edit')
        if (container && !editButton) {
          this.insertTemplate(container.dataset.id)
        }
      })

      window.addEventListener('click', this.hideOnClick, true)
      window.addEventListener('keydown', this.hideOnEsc, true)

      // prevent Gmail from handling keydown.
      // any keys assigned to Gmail keyboard shortcuts are prevented
      // from being inserted in the search field.
      window.addEventListener('keydown', this.stopTargetPropagation, true)
      // prevent Front from handling keyboard shortcuts
      // when we're typing in the search field.
      window.addEventListener('keypress', this.stopTargetPropagation, true)

      // prevent parent page from handling focus events.
      // fix interaction with our dialog in some modals (LinkedIn, Twitter).
      // prevent the page from handling the focusout event when switching focus to our dialog.
      window.addEventListener('focusout', this.stopRelatedTargetPropagation, true)
      window.addEventListener('focusin', this.stopTargetPropagation, true)
    }
    disconnectedCallback () {
      window.removeEventListener('click', this.hideOnClick, true)
      window.removeEventListener('keydown', this.hideOnEsc, true)
      window.removeEventListener('keydown', this.handleSearchFieldShortcuts, true)

      store.off('login', this.setAuthState)
      store.off('logout', this.setAuthState)

      window.removeEventListener('keydown', this.stopTargetPropagation, true)
      window.removeEventListener('keypress', this.stopTargetPropagation, true)

      window.removeEventListener('focusout', this.stopRelatedTargetPropagation, true)
      window.removeEventListener('focusin', this.stopTargetPropagation, true)
    }
    render () {
      render(html`
        <style>${styles}</style>
        <div
          class=${classMap({
            'dialog-container': true,
            'dialog-safari': REGISTER_DISABLED,
          })}
          >
          <input type="search" value="" placeholder="Search templates...">
          <div class="dialog-info">
            Please
            <a href="${popupUrl}?source=tab" target="_blank">Sign in</a>
            <span class="dialog-safari-hide">
              or
              <a href="${signupUrl}" target="_blank">
                Create a free account
              </a>
            </span>
            <span class="dialog-safari-show">
              to access your templates.
            </span>
          </div>
          <ul class="dialog-templates">
            ${this.loading === true
              ? Array(4).fill(html`
                <div class="templates-placeholder">
                  <div class="templates-placeholder-text"></div>
                  <div class="templates-placeholder-text templates-placeholder-description"></div>
                </div>
              `)
              : this.templates.length
              ? repeat(this.templates, (t) => t.id, (t) => {
                  const plainBody = plainText(t.body)
                  return html`
                    <li
                      data-id=${t.id}
                      title=${plainBody}
                      class=${classMap({
                        [activeTemplateClass]: t.id === this.activeItem,
                      })}
                      >
                      <div class="d-flex">
                        <h1>${t.title}</h1>
                        ${t.shortcut ? html`
                          <abbr>${t.shortcut}</abbr>
                        ` : ''}
                      </div>
                      <p>${plainBody.slice(0, 100)}</p>
                      <a
                        href="${config.functionsUrl}/template/${t.id}"
                        target="_blank"
                        class="template-edit dialog-safari-hide"
                        title="Edit template"
                        >
                        ${unsafeSVG(editIcon)}
                      </a>
                    </li>
                  `
                })
              : html`
                <div class="templates-no-results">
                  No templates found
                </div>
              `}
          </ul>
          <div class="dialog-footer">
            <div class="d-flex">
              <div class="flex-fill">
                <a
                  href="${config.functionsUrl}/template/new"
                  target="_blank"
                  class="btn btn-primary btn-new-template dialog-safari-hide"
                  title="Create a new template"
                  >
                  <span class="d-flex">
                    ${unsafeSVG(plusIcon)}
                    <span>
                      New Template
                    </span>
                  </span>
                </a>
              </div>

              <div class="dialog-shortcut">
                ${this.getAttribute('shortcut')}
              </div>
            </div>
          </div>
        </div>
      `, this.shadowRoot)
    }
  }
)

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

function createDialog (settings = {}) {
  const instance = document.createElement(dialogTagName)
  instance.setAttribute('shortcut', settings.dialog_shortcut)
  instance.setAttribute('sort-az', settings.dialog_sort)
  document.documentElement.appendChild(instance)

  return instance
}

let settingsCache = {}
function createAndShow (e) {
  if (!dialogInstance) {
    dialogInstance = createDialog(settingsCache)
  }
  return dialogInstance.show(e)
}

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  settingsCache = settings
  keybind(settingsCache.dialog_shortcut, createAndShow)
  window.addEventListener(dialogShowEvent, createAndShow)
}

export function destroy () {
  keyunbind(settingsCache.dialog_shortcut, createAndShow)
  window.removeEventListener(dialogShowEvent, createAndShow)

  if (dialogInstance) {
    dialogInstance.remove()
    dialogInstance = null
  }
}
