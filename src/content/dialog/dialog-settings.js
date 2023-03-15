import {render} from 'lit-html'
import {html, unsafeStatic} from 'lit-html/static.js'

import {reactive} from '../component.js'
import store from '../../store/store-client.js'
import config from '../../config.js'

import styles from './dialog-settings.css'

const componentStyles = unsafeStatic(styles)

export default class DialogSettings extends HTMLElement {
  constructor () {
    super()

    this.state = reactive({
      extensionData: {},
    }, this, () => {
      this.render()
    })

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

    const form = this.querySelector('form')
    if (form) {
      form.addEventListener('change', (e) => {
        let updatedData = {}
        if (e.target.id === 'dialog_sort') {
          updatedData.dialogSort = e.target.value
        }

        if (e.target.id === 'dialog_tags') {
          updatedData.dialogTags = e.target.checked
        }

        store.setExtensionData(updatedData)
      })
    }
  }
}

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

function template ({extensionData: {dialogTags, dialogSort}}) {
  return html`
    <style>${componentStyles}</style>
    <div class="dialog-settings dialog-modal">
      <div class="dialog-modal-header">
        <h2 class="text-secondary">
          Dialog settings
        </h2>

        <button
          type="button"
          class="btn btn-close"
          title="Close dialog settings"
          >
        </button>
      </div>
      <div class="dialog-modal-body">
        <form>
          <div class="form-block d-flex">
            <label for="dialog_sort" class="form-label">
              Sort templates by
            </label>
            <select id="dialog_sort" class="form-select">
              ${sortOptions.map((option) => html`
                <option
                  value=${option.value}
                  .selected=${option.value === dialogSort}
                  >
                  ${option.label}
                </option>
              `)}
            </select>
          </div>
          <div class="form-block d-flex">
            <label class="form-label">
              Template tags
            </label>
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                id="dialog_tags"
                .checked=${dialogTags}
                >
              <label class="form-check-label" for="dialog_tags">
                Show tags in the dialog
              </label>
            </div>
          </div>
          <div class="form-block d-flex">
            <label class="form-label">
              General settings
            </label>
            <div>
              <p>
                Manage additional settings for Briskine in the Dashboard.
              </p>
              <a
                href="${config.functionsUrl}/settings"
                target="_blank"
                class="btn dialog-safari-hide"
                >
                Open general settings
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  `
}
