/* global REGISTER_DISABLED */
import browser from 'webextension-polyfill'
import {render} from 'lit-html'
import {html, literal, unsafeStatic} from 'lit-html/static.js'
import {classMap} from 'lit-html/directives/class-map.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import {repeat} from 'lit-html/directives/repeat.js'
import iconArrowUpRightSquare from 'bootstrap-icons/icons/arrow-up-right-square.svg?raw'

import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import {autocomplete, getSelectedWord, getSelection, getEventTarget} from '../autocomplete.js'
import {keybind, keyunbind} from '../keybind.js'

import config from '../../config.js'

import DialogFooter from './dialog-footer.js'
import DialogSettings from './dialog-settings.js'

import styles from './dialog.css'

function scopeElementName (name = '') {
  return `${name}-${Date.now().toString(36)}`
}

const dialogFooterTagName = scopeElementName('b-dialog-footer')
customElements.define(dialogFooterTagName, DialogFooter)
const dialogFooterComponent = literal([dialogFooterTagName])

const dialogSettingsTagName = scopeElementName('b-dialog-settings')
customElements.define(dialogSettingsTagName, DialogSettings)
const dialogSettingsComponent = literal([dialogSettingsTagName])

const dialogStyles = unsafeStatic(styles)

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'
export const dialogTagName = `b-dialog-${Date.now().toString(36)}`

const templateRenderLimit = 42
const modalAttribute = 'modal'
const dialogVisibleAttr = 'visible'
const openAnimationClass = 'b-dialog-open-animation'
const activeTemplateClass = 'active'

// action.openPopup is not supported in all browsers yet.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/openPopup
// Open the action popup in a new tab.
const popupUrl = browser.runtime.getURL('popup/popup.html')
const signupUrl = `${config.websiteUrl}/signup`

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

      this.tags = []

      this.extensionData = {}
      this.keyboardShortcut = ''

      this.searchField = null
      this.searchQuery = ''

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
        this.searchQuery = searchQuery
        // give it a second before focusing.
        // in production, the search field is not focused on some websites (eg. google sheets, salesforce).
        setTimeout(() => {
          this.searchField.focus()
        })

        // restore scroll position faster than on re-rendering
        this.setActive(this.activeItem, true)

        // populate the template list
        window.requestAnimationFrame(this.populateTemplates)
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

      this.sortTemplates = async (templates = []) => {
        const sort = this.extensionData.dialogSort || 'last_used'
        const lastUsed = this.extensionData.templatesLastUsed || {}

        if (['title', 'shortcut'].includes(sort)) {
          return templates
            .sort((a, b) => {
              return a[sort].localeCompare(b[sort])
            })
        }

        if (sort === 'modified_datetime') {
          return templates
            .sort((a, b) => {
              return new Date(b.modified_datetime || 0) - new Date(a.modified_datetime || 0)
            })
        }

        // default last_used sort
        return templates
          .sort((a, b) => {
            return new Date(lastUsed[b.id] || 0) - new Date(lastUsed[a.id] || 0)
          })
      }

      this.getAllTemplates = async () => {
        const templates = await store.getTemplates()
        this.loading = false
        return templates
      }

      this.populateTemplates = async () => {
        let active = null
        if (this.searchQuery) {
          const {query, results, tags} = await store.searchTemplates(this.searchQuery)
          if (query !== this.searchQuery) {
            return
          }

          this.tags = tags
          this.templates = results.slice(0, templateRenderLimit)
          if (this.templates.length) {
            active = this.templates[0].id
          }
        } else {
          const allTemplates = await this.getAllTemplates()
          this.templates = await this.sortTemplates(allTemplates.slice(0, templateRenderLimit))
          this.tags = await store.getTags()

          if (this.activeItem && this.templates.find((t) => t.id === this.activeItem)) {
            active = this.activeItem
          } else if (this.templates.length) {
            active = this.templates[0].id
          }
        }

        this.render()
        this.setActive(active, true)
      }

      this.setActive = (id = '', scrollIntoView = false) => {
        const newActive = this.shadowRoot.querySelector(`[data-id="${id}"]`)
        if (this.activeItem !== id) {
          // manually apply and remove active classes,
          // relying on conditionally rendering the active class can get slow with large lists.
          const currentActive = this.shadowRoot.querySelector(`.${activeTemplateClass}`)
          if (currentActive) {
            currentActive.classList.remove(activeTemplateClass)
          }
          if (newActive) {
            newActive.classList.add(activeTemplateClass)
          }
        }

        if (newActive && scrollIntoView) {
          newActive.scrollIntoView({block: 'nearest'})
        }
        this.activeItem = id
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

      this.updateExtensionData = (data) => {
        if (this.extensionData.dialogSort !== data.dialogSort) {
          // require to re-sort templates
          // TODO but this triggers a double render, with the render below
          this.populateTemplates()
        }

        this.extensionData = data
        this.render()
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
        if (
          e.target !== this ||
          composedTarget !== this.searchField ||
          !['Enter', 'ArrowDown', 'ArrowUp'].includes(e.key)
        ) {
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

      this.render = () => {
        render(html`
          <style>${dialogStyles}</style>
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
                    return html`
                      <li
                        data-id=${t.id}
                        class=${classMap({
                          'dialog-template-item': true,
                          [activeTemplateClass]: t.id === this.activeItem,
                        })}
                        >
                        <div class="d-flex">
                          <h1>${t.title}</h1>
                          ${t.shortcut ? html`
                            <abbr>${t.shortcut}</abbr>
                          ` : ''}
                        </div>
                        <p>${t._body_plaintext.slice(0, 100)}</p>
                        ${this.extensionData.dialogTags && t.tags && t.tags.length ? html`
                          <ul class="dialog-tags">
                            ${repeat(t.tags, (tagId) => tagId, (tagId) => {
                              const tag = this.tags.find((tag) => tag.id === tagId)
                              if (!tag) {
                                return ''
                              }

                              return html`
                                <li
                                  style="--tag-bg-color: var(--tag-color-${tag.color})"
                                  class=${classMap({
                                    'text-secondary': !tag.color || tag.color === 'transparent',
                                  })}
                                >
                                  ${tag.title}
                                </li>
                              `
                            })}
                          </ul>
                        ` : ''}
                        <div class="edit-container">
                          <a
                            href="${config.functionsUrl}/template/${t.id}"
                            target="_blank"
                            class="btn btn-sm btn-edit dialog-safari-hide"
                            title="Edit template"
                            >
                            ${unsafeSVG(iconArrowUpRightSquare)}
                          </a>
                        </div>
                      </li>
                    `
                  })
                : html`
                  <div class="templates-no-results">
                    No templates found
                  </div>
                `}
            </ul>
            <${dialogFooterComponent}
              .shortcut=${this.keyboardShortcut}
            />
            <${dialogSettingsComponent}
              .extensionData=${{...this.extensionData}}
            />
          </div>
        `, this.shadowRoot)
      }
    }
    static get observedAttributes() { return ['visible'] }
    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'visible') {
        if (newValue === 'true') {
          this.classList.add(openAnimationClass)
        } else {
          this.classList.remove(openAnimationClass)

          window.requestAnimationFrame(() => {
            // clear the search query
            this.searchQuery = ''
            // close settings
            this.removeAttribute(modalAttribute)

            // re-render in the background,
            // to speed up rendering on show.
            this.populateTemplates()
          })
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

        this.searchQuery = e.target.value
        searchDebouncer = setTimeout(this.populateTemplates, 200)
      })

      // keyboard navigation and insert for templates
      window.addEventListener('keydown', this.handleSearchFieldShortcuts, true)

      // hover templates
      this.shadowRoot.addEventListener('mouseover', (e) => {
        const container = e.target.closest('[data-id]')
        if (container) {
          this.setActive(container.dataset.id)

          // add the title attribute only when hovering the template.
          // speeds up rendering the template list.
          const template = this.templates.find((t) => t.id === container.dataset.id)
          if (template) {
            container.title = template._body_plaintext
          }
        }
      })

      // insert templates on click
      this.shadowRoot.addEventListener('click', (e) => {
        const container = e.target.closest('[data-id]')
        // prevent inserting templates when clicking the edit button
        const editButton = e.target.closest('.btn-edit')
        if (container && !editButton) {
          this.insertTemplate(container.dataset.id)
        }
      })

      store.getExtensionData().then(this.updateExtensionData)
      store.on('extension-data-updated', this.updateExtensionData)

      this.addEventListener('b-dialog-set-modal', (e) => {
        if (e.detail && this.getAttribute(modalAttribute) !== e.detail) {
          this.setAttribute(modalAttribute, e.detail)
        } else {
          this.removeAttribute(modalAttribute)
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

      store.off('extension-data-updated', this.updateExtensionData)

      window.removeEventListener('keydown', this.stopTargetPropagation, true)
      window.removeEventListener('keypress', this.stopTargetPropagation, true)

      window.removeEventListener('focusout', this.stopRelatedTargetPropagation, true)
      window.removeEventListener('focusin', this.stopTargetPropagation, true)
    }
  }
)

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

function createDialog (settings = {}) {
  const instance = document.createElement(dialogTagName)
  instance.keyboardShortcut = settings.dialog_shortcut
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
