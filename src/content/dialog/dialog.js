/* global Mousetrap */
import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'

const dialogVisibleAttr = 'visible'
const dialogMaxHeight = 250
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

          console.log('got show', e)

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
          // TODO keep the bubble visible if we showed the dialog from it
          // and haven't hidden it
          if (this.contains(e.target)) {
            return
          }

          this.removeAttribute(dialogVisibleAttr)
        }
      }
      connectedCallback () {
        if (!this.isConnected) {
          return
        }

        const shadowRoot = this.attachShadow({mode: 'open'})
        shadowRoot.innerHTML = `
          <style>${styles}</style>
          <div>
            dialog
            <input type="text" style="width: 100%">
          </div>
        `

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

function getDialogPosition (targetNode, instance) {
  const pageHeight = window.innerHeight
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  const dialogMetrics = instance.getBoundingClientRect()

  // in case we want to position the dialog next to
  // another element,
  // not next to the cursor.
  // eg. when we position it next to the qa button.
  const targetMetrics = targetNode.getBoundingClientRect()

  // because we use getBoundingClientRect
  // we need to add the scroll position
  let topPos = targetMetrics.top + targetMetrics.height + scrollTop
  let leftPos = targetMetrics.left + scrollLeft

  // if targetNode is range
  if (targetNode instanceof Range) {
    leftPos = leftPos + targetMetrics.width
  }

  // check if we have enough space at the bottom
  // for the maximum dialog height
  const bottomSpace = pageHeight - topPos - scrollTop
  if (bottomSpace < dialogMaxHeight) {
    topPos = topPos - dialogMetrics.height - targetMetrics.height
  }

  return {
    top: topPos,
    left: leftPos,
    targetWidth: targetMetrics.width,
  }
}

function getContentEditableCaret () {
  const selection = window.getSelection()
  if (selection.rangeCount !== 0) {
    const range = selection.getRangeAt(0)
    // TODO explain
    // https://github.com/w3c/csswg-drafts/issues/2514
    // TODO doesn't work with rtl positining
    if (range.collapsed === true && range.endContainer.nodeType === Node.ELEMENT_NODE) {
      return range.endContainer
    }
    return range
  }
}

const mirrorStyles = [
  // box
  'box-sizing',
  'height',
  'width',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'border-width',
  // font
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  // spacing
  'word-spacing',
  'letter-spacing',
  'line-height',
  'text-decoration',
  'text-indent',
  'text-transform',
  // direction
  'direction',
]

// get caret position in input and textarea,
// using a virtual caret in a mirrored block.
function getEditableCaret (element) {
  const $mirror = document.createElement('div')
  $mirror.style = `
    overflow: auto;
    position: absolute;
    visibility: hidden;

    white-space: pre-wrap;
    word-wrap: break-word;
  `
  $mirror.className = element.className

  // mirror styles
  const sourceStyles = window.getComputedStyle(element)
  mirrorStyles.forEach((property) => {
    $mirror.style.setProperty(property, sourceStyles.getPropertyValue(property))
  })

  const sourceMetrics = element.getBoundingClientRect()
  $mirror.style.top = `${sourceMetrics.top}px`
  $mirror.style.left = `${sourceMetrics.left}px`

  // copy content
  $mirror.textContent = element.value.substring(0, element.selectionEnd)

  const $virtualCaret = document.createElement('span')
  $virtualCaret.textContent = '.'
  $mirror.appendChild($virtualCaret)

  // insert mirror
  document.body.appendChild($mirror)

  return $virtualCaret
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

