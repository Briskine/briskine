import {render, html} from 'lit-html'

import store from '../../store/store-client.js'

import config from '../../config.js'

import styles from './dialog-settings.css?raw'

export const dialogSettingsTagName = `b-dialog-settings-${Date.now().toString(36)}`

const sortOptions = [
  {
    label: 'Recently used',
    value: 'last_used'
  },
  {
    label: 'Recently modified',
    value: 'modified_datetime'
  },
  {
    label: 'Title',
    value: 'title'
  },
  {
    label: 'Shortcut',
    value: 'shortcut'
  },
]

customElements.define(
  dialogSettingsTagName,
  class extends HTMLElement {
    constructor () {
      super()

      this.sortBy = 'last_used'
      store.getExtensionData().then((data) => {
        this.sortBy = data.dialogSort
      })
    }

    connectedCallback () {
      if (!this.isConnected) {
        return
      }

      this.render()

      const closeBtn = this.querySelector('.btn-close')
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.dispatchEvent(new Event('settings-close', { bubbles: true, composed: true }))
        })
      }

      const form = this.querySelector('form')
      if (form) {
        form.addEventListener('change', (e) => {
          if (e.target && e.target.id === 'sort_by') {
            store.setExtensionData({
              dialogSort: e.target.value,
            })

            this.dispatchEvent(new Event('settings-updated', { bubbles: true, composed: true }))
          }
        })
      }
    }

    render () {
      render(html`
        <style>${styles}</style>
        <div class="dialog-settings dialog-modal">
          <div class="dialog-modal-header">
            <h2>
              Dialog Settings
            </h2>

            <button
              type="button"
              class="btn btn-close"
              title="Close Dialog Settings"
              >
            </button>
          </div>
          <div class="dialog-modal-body">
            <form>
              <div class="form-block d-flex">
                <label for="sort_by" class="form-label">
                  Sort templates by
                </label>
                <select id="sort_by" class="form-select">
                  ${sortOptions.map((option) => html`
                    <option
                      value=${option.value}
                      ?selected=${option.value === this.sortBy}
                      >
                      ${option.label}
                    </option>
                  `)}
                </select>
              </div>
              <div class="form-block d-flex">
                <label class="form-label">
                  General settings
                </label>
                <div>
                  <p>
                    Manage additional settings for Briskine in the Dashboard.
                  </p>
                  <a href="${config.functionsUrl}/settings" target="_blank" class="btn">
                    Open General Settings
                  </a>
                </div>
              </div>
            </form>
          </div>
        </div>
      `, this)
    }
  }
)