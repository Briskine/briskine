import {render, html} from 'lit-html'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import iconGear from 'bootstrap-icons/icons/gear.svg?raw'
import iconPlus from 'bootstrap-icons/icons/plus.svg?raw'

import config from '../../config.js'

export default class DialogFooter extends HTMLElement {
  constructor () {
    super()

    this.state = {
      shortcut: '',
    }

    this.render = () => {
      render(template(this.state), this)
    }
  }
  set shortcut (value = '') {
    this.state.shortcut = value
    this.render()
  }
  connectedCallback () {
    if (!this.isConnected) {
      return
    }

    this.render()

    this.classList.add('dialog-footer')

    this.addEventListener('click', (e) => {
      const settingsBtn = e.target.closest('.btn-settings')
      if (settingsBtn) {
        this.dispatchEvent(new CustomEvent('b-dialog-set-modal', {
          bubbles: true,
          composed: true,
          detail: 'settings',
        }))
      }
    })
  }
}

function template ({shortcut=''}) {
  return html`
    <div class="d-flex">
      <div class="flex-fill">
        <a
          href="${config.functionsUrl}/template/new"
          target="_blank"
          class="btn btn-primary btn-new-template dialog-safari-hide"
          title="Create a new template"
          >
          <span class="d-flex">
            ${unsafeSVG(iconPlus)}
            <span>
              New Template
            </span>
          </span>
        </a>
      </div>

      <div
        class="dialog-shortcut btn"
        title="Press ${shortcut} in any text field to open the Briskine Dialog."
        >
        ${shortcut}
      </div>
      <button
        type="button"
        class="btn btn-sm btn-settings"
        title="Dialog Settings"
        >
        ${unsafeSVG(iconGear)}
      </button>
    </div>
  `
}
