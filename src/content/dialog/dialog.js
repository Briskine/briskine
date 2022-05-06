/* Dialog
 */

import {html, render} from 'lit-html'

import store from '../../store/store-client.js'

import styles from './dialog.css?raw'

let dialogInstance = null

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
        render(html`
          <style>${styles}</style>
          <div>dialog</div>
        `, shadowRoot)
      }
    }
  )
}

function create () {
  // dialog is defined later,
  // to avoid errors with other existing intances on page,
  // when reloading the bubble without page refresh.
  // (connectedCallback is triggered when re-defining an existing element)
  defineDialog()

  dialogInstance = document.createElement('b-dialog')
  document.documentElement.appendChild(dialogInstance)

  // TODO set up shortcuts and functionality
}

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  // TODO use settings.dialog_limit

  create()
}

export function destroy () {
  // TODO check if we have a dialog instance and destroy it
  if (!dialogInstance) {
    return
  }

  // TODO destroy
  dialogInstance.remove()

  // TODO remove key bindings
}

