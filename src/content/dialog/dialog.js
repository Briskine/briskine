/* global Mousetrap, REGISTER_DISABLED */
import browser from 'webextension-polyfill'

import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import fuzzySearch from '../search.js'
import {autocomplete, getSelectedWord} from '../autocomplete.js'

import config from '../../config.js'
import {editIcon, plusIcon} from './dialog-icons.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'
export const dialogTagName = 'b-dialog'

const dialogVisibleAttr = 'visible'
const targetWidthProperty = '--target-width'
const activeClass = 'active'
const dialogHeight = 270
const heightProperty = '--dialog-height'

const template = document.createElement('template')
function plainText (html = '') {
  template.innerHTML = html
  return (template.content.textContent || '').trim()
}

function defineDialog () {
  customElements.define(
    dialogTagName,
    class extends HTMLElement {
      constructor () {
        super()

        this.searchField = null
        this.templates = []

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
          let endPositioning = false
          let removeCaretParent = false

          this.anchorNode = null
          this.anchorOffset = 0
          this.focusNode = null
          this.focusOffset = 0

          if (isTextfield(e.target)) {
            // input, textarea
            target = getEditableCaret(e.target)
            removeCaretParent = true
          } else if (isContentEditable(e.target)) {
            // contenteditable
            target = getContentEditableCaret(e.target)

            // cache selection details, to restore later
            const selection = window.getSelection()
            this.focusNode = selection.focusNode
            this.focusOffset = selection.focusOffset
            this.anchorNode = selection.anchorNode
            this.anchorOffset = selection.anchorOffset
          } else if (e.target.tagName.toLowerCase() === bubbleTagName) {
            // bubble
            target = e.target
            endPositioning = true
          } else {
            return
          }

          e.preventDefault()

          // cache editor, range and focusNode,
          // to use for inserting templates or restoring later.
          this.editor = document.activeElement

          this.word = getSelectedWord({
            element: this.editor
          })

          // detect rtl
          const targetStyle = window.getComputedStyle(e.target)
          const direction = targetStyle.direction || 'ltr'
          this.setAttribute('dir', direction)

          // must be set visible before positioning,
          // so we can get its dimensions.
          this.setAttribute(dialogVisibleAttr, true)

          const position = getDialogPosition(target, this, dialogHeight)
          this.style.setProperty(targetWidthProperty, `${position.targetWidth}px`)

          if (endPositioning) {
            this.setAttribute('end', 'true')
          } else {
            this.removeAttribute('end')
          }

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
          const searchQuery = e.target.getAttribute('data-briskine-search') || ''
          this.searchField.value = searchQuery
          this.searchField.focus()

          // populate the template list
          this.populateTemplates(searchQuery)
        }

        this.hideOnClick = (e) => {
          if (!this.contains(e.target) && this.hasAttribute(dialogVisibleAttr)) {
            this.removeAttribute(dialogVisibleAttr)
          }
        }

        this.getTemplates = (query = '') => {
          return store.getTemplates()
            .then((templates) => {
              let filteredTemplates = templates
              if (query) {
                filteredTemplates = fuzzySearch(templates, query)
              }

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
                    return new Date(b.lastuse_datetime || 0) - new Date(a.lastuse_datetime || 0)
                  })
              }

              const limit = parseInt(this.getAttribute('limit') || '100', 10)
              return filteredTemplates.slice(0, limit)
            })
            .then((templates) => {
              return templates
            })
        }

        this.getTemplateNodes = (templates = []) => {
          // blank slate when we don't find any templates
          if (!templates.length) {
            const blank = document.createElement('div')
            blank.classList.add('templates-no-results')
            blank.textContent = 'No templates found.'
            return [blank]
          }

          return templates
            .map((t, i) => {
              const li = document.createElement('li')
              li.setAttribute('data-id', t.id)
              if (i === 0) {
                li.classList.add(activeClass)
              }

              const plainBody = plainText(t.body)
              const plainShortcut = plainText(t.shortcut)
              li.title = plainBody
              li.innerHTML = `
                <div class="d-flex">
                  <h1>${plainText(t.title)}</h1>
                  <div>
                  ${plainShortcut ? `
                    <abbr>${plainShortcut}</abbr>
                  ` : ''}
                  </div>
                </div>
                <p>${plainBody}</p>
                <a
                  href="${config.functionsUrl}/template/${t.id}"
                  target="_blank"
                  class="template-edit dialog-safari-hide"
                  title="Edit template"
                  >
                  ${editIcon}
                </a>
              `
              return li
            })
        }

        this.populateTemplates = (query = '') => {
          this.getTemplates(query)
            .then((templates) => {
              // naive deep compare, in case the templates didn't change
              if (JSON.stringify(this.templates) === JSON.stringify(templates)) {
                return
              }

              // cache result
              this.templates = templates

              const templateNodes = this.getTemplateNodes(templates)

              window.requestAnimationFrame(() => {
                this.shadowRoot.querySelector('.dialog-templates').replaceChildren(...templateNodes)
              })
            })
        }

        this.setActive = (id = '') => {
          const item = this.shadowRoot.querySelector(`[data-id="${id}"]`)
          if (!item) {
            return
          }

          const active = this.shadowRoot.querySelector(`.${activeClass}`)
          if (active !== item) {
            active.classList.remove(activeClass)
            item.classList.add(activeClass)
          }

          return item
        }

        this.restoreSelection = () => {
          this.editor.focus()
          // only try to restore the selection on contenteditable.
          // input and textarea will restore the correct range with focus().
          if (
            isContentEditable(this.editor) &&
            this.anchorNode &&
            this.focusNode
          ) {
            window.getSelection().setBaseAndExtent(this.anchorNode, this.anchorOffset, this.focusNode, this.focusOffset)
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

        this.setLoadingState = () => {
          const loadingPlaceholders = Array(4).fill(`
            <div class="templates-placeholder">
              <div class="templates-placeholder-text"></div>
              <div class="templates-placeholder-text templates-placeholder-description"></div>
            </div>
          `).join('')
          this.shadowRoot.querySelector('.dialog-templates').innerHTML = loadingPlaceholders
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
              this.setLoadingState()
              // only start loading the templates if the dialog is visible
              if (this.hasAttribute(dialogVisibleAttr)) {
                this.populateTemplates()
              }
            })
        }

        this.globalPrevent = (e) => {
          if (e.relatedTarget && e.relatedTarget.closest(dialogTagName)) {
            e.stopPropagation()
          }
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

      }
      connectedCallback () {
        if (!this.isConnected) {
          return
        }

        // browserAction.openPopup is not supported in all browsers yet.
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/openPopup
        // Open the browserAction popup in a new tab.
        const popupUrl = browser.runtime.getURL('popup/popup.html')
        const signupUrl = `${config.websiteUrl}/signup`
        const shortcut = this.getAttribute('shortcut')

        const shadowRoot = this.attachShadow({mode: 'open'})
        shadowRoot.innerHTML = `
          <style>${styles}</style>
          <div class="dialog-container ${REGISTER_DISABLED ? 'dialog-safari' : ''}">
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
                      ${plusIcon}
                      <span>
                        New Template
                      </span>
                    </span>
                  </a>
                </div>

                <div class="dialog-shortcut">
                  ${shortcut}
                </div>
              </div>
            </div>
          </div>
        `

        this.style.setProperty(heightProperty, `${dialogHeight}px`)

        // check authentication state
        this.setAuthState()
        store.on('login', this.setAuthState)
        store.on('logout', this.setAuthState)
        // set up templates when changed/received
        store.on('templates-updated', this.populateTemplates)

        let searchDebouncer
        this.searchField = shadowRoot.querySelector('input[type=search]')
        // search for templates
        this.searchField.addEventListener('input', (e) => {
          e.stopPropagation()
          if (searchDebouncer) {
            clearTimeout(searchDebouncer)
          }

          const query = e.target.value
          searchDebouncer = setTimeout(() => {
            this.populateTemplates(query)
          }, 200)
        })
        // keyboard navigation and insert for templates
        this.searchField.addEventListener('keydown', (e) => {
          const active = this.shadowRoot.querySelector(`.${activeClass}`)
          if (!active) {
            return
          }

          if (e.key === 'Enter') {
            e.preventDefault()
            const activeId = active.dataset.id
            return this.insertTemplate(activeId)
          }

          let nextId
          if (e.key === 'ArrowDown' && active.nextElementSibling) {
            nextId = active.nextElementSibling.dataset.id
          } else if (e.key === 'ArrowUp' && active.previousElementSibling) {
            nextId = active.previousElementSibling.dataset.id
          }

          if (nextId) {
            e.preventDefault()
            const newActive = this.setActive(nextId)
            newActive.scrollIntoView({block: 'nearest'})
          }
        })
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

        document.addEventListener(dialogShowEvent, this.show)
        document.addEventListener('click', this.hideOnClick)

        Mousetrap.bindGlobal(shortcut, this.show)

        // fix interaction with our dialog in some modals (LinkedIn, Twitter).
        // prevent the page from handling the focusout event when switching focus to our dialog.
        window.addEventListener('focusout', this.globalPrevent, true)
        window.addEventListener('keydown', this.hideOnEsc, true)
      }
      disconnectedCallback () {
        document.removeEventListener(dialogShowEvent, this.show)
        document.removeEventListener('click', this.hideOnClick)

        store.off('login', this.setAuthState)
        store.off('logout', this.setAuthState)
        store.off('templates-updated', this.populateTemplates)

        window.removeEventListener('focusout', this.globalPrevent, true)
        window.removeEventListener('keydown', this.hideOnEsc, true)
      }
    }
  )
}

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  // dialog is defined later,
  // to avoid errors with other existing instances on page,
  // when reloading the bubble without page refresh.
  // (connectedCallback is triggered when re-defining an existing element)
  defineDialog()

  dialogInstance = document.createElement(dialogTagName)
  dialogInstance.setAttribute('shortcut', settings.dialog_shortcut)
  dialogInstance.setAttribute('sort-az', settings.dialog_sort)
  dialogInstance.setAttribute('limit', settings.dialog_limit)
  document.documentElement.appendChild(dialogInstance)
}

export function destroy () {
  if (!dialogInstance) {
    return
  }

  dialogInstance.remove()
}
