/* global REGISTER_DISABLED */
import browser from 'webextension-polyfill'
import {render, html} from 'lit-html'
import {classMap} from 'lit-html/directives/class-map.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'

import store from '../../store/store-client.js'

import config from '../../config.js'
import {editIcon, plusIcon} from './dialog-icons.js'

import styles from './dialog-settings.css?raw'

export const dialogSettingsTagName = `b-dialog-settings-${Date.now()}`

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

      this.attachShadow({mode: 'open'})
      this.render()

      const form = this.shadowRoot.querySelector('form')
      if (form) {
        form.addEventListener('change', (e) => {
          console.log('change', e.target.value)
          if (e.target && e.target.id === 'sort_by') {
            store.setExtensionData({
              dialogSort: e.target.value,
            })
          }
        })
      }
    }

    render () {
      render(html`
        <style>${styles}</style>
        <div>
          <div class="dialog-settings-title">
            Briskine Dialog Settings
          </div>
          <div class="dialog-settings-content">
            <form>
              <div>
                <label for="sort_by">
                  Sort by
                </label>
                <select id="sort_by">
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
            </form>
          </div>
        </div>
      `, this.shadowRoot)
    }
  }
)
