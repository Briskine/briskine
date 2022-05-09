/* Dialog
 */

import store from '../../store/store-client.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'

function defineDialog () {
  customElements.define(
    'b-dialog',
    class extends HTMLElement {
      constructor () {
        super()
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
      }
      disconnectedCallback () {
        console.log('disconnectedCallback')
      }
    }
  )
}

// TODO add RTL support
function setDialogPosition (targetNode) {
  // BUG positioning is set to the right of the bubble on first click
  const dialogMaxHeight = 250
  const pageHeight = window.innerHeight
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  const dialogMetrics = dialogInstance.getBoundingClientRect()

  // in case we want to position the dialog next to
  // another element,
  // not next to the cursor.
  // eg. when we position it next to the qa button.
  const targetMetrics = targetNode.getBoundingClientRect()

  // because we use getBoundingClientRect
  // we need to add the scroll position
  let topPos = targetMetrics.top + targetMetrics.height + scrollTop
  let leftPos = targetMetrics.left + targetMetrics.width + scrollLeft - dialogMetrics.width

  // check if we have enough space at the bottom
  // for the maximum dialog height
  const bottomSpace = pageHeight - topPos - scrollTop
  if (bottomSpace < dialogMaxHeight) {
    topPos = topPos - dialogMetrics.height - targetMetrics.height
  }

  dialogInstance.style.top = `${topPos}px`
  dialogInstance.style.left = `${leftPos}px`
}

function show (e) {
  console.log('got show', e)

  setDialogPosition(e.target)

  dialogInstance.style.display = 'block'
}

function hide (e) {
  if (e && dialogInstance && dialogInstance.contains(e.target)) {
    return
  }

  dialogInstance.style.display = 'none'
}

function create () {
  // dialog is defined later,
  // to avoid errors with other existing intances on page,
  // when reloading the bubble without page refresh.
  // (connectedCallback is triggered when re-defining an existing element)
  defineDialog()

  dialogInstance = document.createElement('b-dialog')
  document.documentElement.appendChild(dialogInstance)

  document.addEventListener(dialogShowEvent, show)
  document.addEventListener('click', hide)

  // TODO set up shortcuts and functionality

}

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  // TODO use settings.dialog_limit
  // TODO instead of dialog_limit, use infinite loading with intersection observer

  create()
}

export function destroy () {
  // TODO check if we have a dialog instance and destroy it
  if (!dialogInstance) {
    return
  }

  // TODO destroy
  dialogInstance.remove()

  document.removeEventListener(dialogShowEvent, show)
  document.removeEventListener('click', hide)

  // TODO remove key bindings
}

