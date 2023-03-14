/* globals VERSION */
import {render, html} from 'lit-html'

import {batch, reactive} from '../component.js'

import store from '../../store/store-client.js'
import config from '../../config.js'

export default class DialogActions extends HTMLElement {
  constructor () {
    super()

    this.state = {
    }

    this.render = () => {
      render(template(this.state), this)
    }
  }
  connectedCallback () {
    if (!this.isConnected) {
      return
    }

    this.render()

    const closeBtn = this.querySelector('.btn-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('b-dialog-set-modal', {
          bubbles: true,
          composed: true,
          detail: '',
        }))
      })
    }
  }
}

function template ({}) {
  return html`
    <div class="dialog-actions dialog-modal">
      <div class="dialog-modal-header">
        <h2>
          Briskine v${VERSION}
        </h2>

        <button
          type="button"
          class="btn btn-close"
          title="Close dialog actions"
          >
        </button>
      </div>
      <div class="dialog-modal-body">
        actions
      </div>
    </div>
  `
}
