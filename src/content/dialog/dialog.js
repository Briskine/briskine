/* global Mousetrap, REGISTER_DISABLED */
import browser from 'webextension-polyfill'

import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import fuzzySearch from '../search.js'
import htmlToText from '../utils/html-to-text.js'

import config from '../../config.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'
export const dialogTagName = 'b-dialog'

const dialogVisibleAttr = 'visible'
const targetWidthProperty = '--target-width'
const activeClass = 'active'
const dialogHeight = 260
const heightProperty = '--dialog-height'

function defineDialog () {
  customElements.define(
    dialogTagName,
    class extends HTMLElement {
      constructor () {
        super()

        this.searchField = null
        this.editor = null
        this.editorRange = null

        this.show = (e) => {
          let target
          let endPositioning = false
          let removeCaretParent = false

          if (isEditable(e.target)) {
            // input, textarea
            target = getEditableCaret(e.target)
            removeCaretParent = true
          } else if (isContentEditable(e.target)) {
            // contenteditable
            target = getContentEditableCaret(e.target)
          } else if (e.target.tagName.toLowerCase() === bubbleTagName) {
            // bubble
            target = e.target
            endPositioning = true
          } else {
            return
          }

          e.preventDefault()

          // cache editor and range,
          // to restore later.
          this.editor = document.activeElement
          const selection = window.getSelection()
          if (selection.rangeCount !== 0) {
            this.range = selection.getRangeAt(0)
          }

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

          // clear the search query when first showing the dialog
          this.searchField.value = ''
          this.searchField.focus()

          // populate the template list
          this.populateTemplates()
        }

        this.hideOnClick = (e) => {
          if (!this.contains(e.target) && this.hasAttribute(dialogVisibleAttr)) {
            this.removeAttribute(dialogVisibleAttr)
          }
        }

        this.getTemplateNodes = (query = '') => {
          return store.getTemplates()
            .then((templates) => {
              let sortedTemplates = templates
              if (query) {
                sortedTemplates = fuzzySearch(templates, query)
              }

              // TODO return a blank slate if we don't find any templates
              if (!sortedTemplates.length) {
                const blank = document.createElement('div')
                blank.textContent = 'no templates found'

                return [blank]
              }

              return sortedTemplates
                // TODO sort filters
                .sort((a, b) => {
                  return new Date(b.updated_datetime) - new Date(a.updated_datetime)
                })
                .map((t, i) => {
                  const li = document.createElement('li')
                  li.setAttribute('data-id', t.id)
                  if (i === 0) {
                    li.classList.add(activeClass)
                  }

                  const plainBody = htmlToText(t.body)
                  li.title = plainBody
                  li.innerHTML = `
                    <div>
                      <h1>${htmlToText(t.title)}</h1>
                      <abbr>${htmlToText(t.shortcut)}</abbr>
                    </div>
                    <p>${plainBody}</p>
                    <a href="${config.functionsUrl}/template/${t.id}" target="_blank">Edit</a>
                  `
                  return li
                })
            })
        }

        this.populateTemplates = (query = '') => {
          console.log('populate')
          // TODO update template list on sort-change, on templates updated (or on show?)
          this.getTemplateNodes(query)
            .then((templateNodes) => {
              this.shadowRoot.querySelector('.dialog-templates').replaceChildren(...templateNodes)
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
      }
      connectedCallback () {
        if (!this.isConnected) {
          return
        }

        // HACK
        // browserAction.openPopup is not supported in all browsers yet.
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/openPopup
        // Open the browserAction popup in a new tab.
        const popupUrl = browser.runtime.getURL('popup/popup.html')
        const signupUrl = `${config.websiteUrl}/signup`

        const shadowRoot = this.attachShadow({mode: 'open'})
        // TODO render a placeholder for the templates
        shadowRoot.innerHTML = `
          <style>${styles}</style>
          <div class="dialog-container">
            <input type="search" value="" placeholder="Search templates...">
            <div class="dialog-info">
              Please
              <a href="${popupUrl}" target="_blank">Sign in</a>
              ${!REGISTER_DISABLED ? `
                or
                <a href="${signupUrl}" target="_blank">
                  Create a free account
                </a>
              ` : 'to access your templates.'}
            </div>
            <ul class="dialog-templates">
              <li>loading</li>
            </ul>
            <div class="dialog-footer">
              footer
            </div>
          </div>
        `

        this.style.setProperty(heightProperty, `${dialogHeight}px`)

        store.on('login', this.populateTemplates)
        store.on('logout', this.populateTemplates)

        let searchDebouncer
        this.searchField = shadowRoot.querySelector('input[type=search]')
        // search for templates
        this.searchField.addEventListener('input', (e) => {
          if (searchDebouncer) {
            clearTimeout(searchDebouncer)
          }

          const query = e.target.value
          searchDebouncer = setTimeout(() => {
            this.populateTemplates(query)
          }, 100)
        })
        // keyboard navigation and insert for templates
        this.searchField.addEventListener('keydown', (e) => {
          const active = this.shadowRoot.querySelector(`.${activeClass}`)
          if (!active) {
            return
          }

          if (e.key === 'Enter') {
            // TODO insert template
            const activeId = active.dataset.id
            console.log('insert', activeId)
            return
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
            newActive.scrollIntoView()
          }
        })
        // hover templates
        this.shadowRoot.addEventListener('mouseover', (e) => {
          const container = e.target.closest('[data-id]')
          if (container) {
            this.setActive(container.dataset.id)
          }
        })

        document.addEventListener(dialogShowEvent, this.show)
        document.addEventListener('click', this.hideOnClick)

        const shortcut = this.getAttribute('shortcut')
        if (shortcut) {
          Mousetrap.bindGlobal(shortcut, this.show)
        }
        Mousetrap.bindGlobal('escape', (e) => {
          if (this.hasAttribute(dialogVisibleAttr)) {
            e.stopPropagation()
            this.removeAttribute(dialogVisibleAttr)

            // restore focus
            if (this.editor) {
              this.editor.focus()

              // only try to restore the selection on contenteditable.
              // input and textarea will restore the correct range with focus().
              if (this.range && isContentEditable(this.editor)) {
                const selection = window.getSelection()
                selection.removeAllRanges()
                selection.addRange(this.range)
              }
            }
          }
        })

        // TODO instead of dialog_limit, use infinite loading with intersection observer
      }
      disconnectedCallback () {
        console.log('disconnectedCallback')

        document.removeEventListener(dialogShowEvent, this.show)
        document.removeEventListener('click', this.hideOnClick)

        // TODO remove key bindings
      }
    }
  )
}

function isEditable (element) {
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

  dialogInstance = document.createElement('b-dialog')
  dialogInstance.setAttribute('shortcut', settings.dialog_shortcut)
  document.documentElement.appendChild(dialogInstance)
}

export function destroy () {
  if (!dialogInstance) {
    return
  }

  dialogInstance.remove()
}

