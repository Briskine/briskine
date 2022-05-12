/* global Mousetrap, REGISTER_DISABLED */
import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'

const dialogVisibleAttr = 'visible'
const targetWidthProperty = '--target-width'

export const dialogTagName = 'b-dialog'

function defineDialog () {
  customElements.define(
    dialogTagName,
    class extends HTMLElement {
      constructor () {
        super()

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

          // detect rtl
          const targetStyle = window.getComputedStyle(e.target)
          const direction = targetStyle.direction || 'ltr'
          this.setAttribute('dir', direction)

          // must be set visible before positioning,
          // so we can get its dimensions.
          this.setAttribute(dialogVisibleAttr, true)

          const position = getDialogPosition(target, this)
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
        }

        this.hide = (e) => {
          if (this.contains(e.target)) {
            return
          }

          this.removeAttribute(dialogVisibleAttr)
        }

        this.getTemplateNodes = (query = '') => {
          return store.getTemplates()
            .then((templates) => {
              console.log(templates)
            })
        }
      }
      connectedCallback () {
        if (!this.isConnected) {
          return
        }

        const signInUrl = ''

        const shadowRoot = this.attachShadow({mode: 'open'})
        shadowRoot.innerHTML = `
          <style>${styles}</style>
          <div class="dialog-info">
            Please
            <a href="${signInUrl}">Sign in</a>
            ${!REGISTER_DISABLED ? `
              or
              <a href="{{signupUrl}}" target="_blank">
                Create a free account
              </a>
            ` : 'to access your templates.'}
          </div>
          <div>
            <input type="search" value="" placeholder="Search templates...">
          </div>
          <div class="dialog-templates">
          </div>
          <div class="dialog-footer">
            footer
          </div>
        `

        // TODO render templates from this list
        this.getTemplateNodes()

        document.addEventListener(dialogShowEvent, this.show)
        document.addEventListener('click', this.hide)

        const shortcut = this.getAttribute('shortcut')
        if (shortcut) {
          Mousetrap.bindGlobal(shortcut, this.show)
        }

        // TODO set up shortcuts and functionality
        // TODO instead of dialog_limit, use infinite loading with intersection observer
      }
      disconnectedCallback () {
        console.log('disconnectedCallback')

        document.removeEventListener(dialogShowEvent, this.show)
        document.removeEventListener('click', this.hide)

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
  // to avoid errors with other existing intances on page,
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

