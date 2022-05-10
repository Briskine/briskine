/* Dialog
 */

import store from '../../store/store-client.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'

const dialogVisibleAttr = 'visible'
const dialogMaxHeight = 250

function defineDialog () {
  customElements.define(
    'b-dialog',
    class extends HTMLElement {
      constructor () {
        super()

        this.show = (e) => {
          console.log('got show', e)

          // must be set visible before positioning,
          // so we can get its dimensions.
          this.setAttribute(dialogVisibleAttr, true)

          const position = getDialogPosition(e.target, this)
          this.style.top = `${position.top}px`
          this.style.left = `${position.left}px`
        }

        this.hide = (e) => {
          // TODO keep the bubble visible if we showed the dialog from it
          // and haven't hidden it
          if (e && this && this.contains(e.target)) {
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
          <div>dialog</div>
        `

        document.addEventListener(dialogShowEvent, this.show)
        document.addEventListener('click', this.hide)

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
  // TODO add RTL support
  let leftPos = targetMetrics.left + targetMetrics.width + scrollLeft - dialogMetrics.width

  // check if we have enough space at the bottom
  // for the maximum dialog height
  const bottomSpace = pageHeight - topPos - scrollTop
  if (bottomSpace < dialogMaxHeight) {
    topPos = topPos - dialogMetrics.height - targetMetrics.height
  }

  return {
    top: topPos,
    left: leftPos
  }
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
  document.documentElement.appendChild(dialogInstance)
}

export function destroy () {
  if (!dialogInstance) {
    return
  }

  dialogInstance.remove()
}

