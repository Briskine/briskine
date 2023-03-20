import {render} from 'lit-html'
import {html, unsafeStatic} from 'lit-html/static.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import iconGear from 'bootstrap-icons/icons/gear.svg?raw'

import iconBriskine from '../../icons/briskine-logo-small.svg?raw'

import {reactive} from '../component.js'
import styles from './dialog-footer.css'

const componentStyles = unsafeStatic(styles)

export default class DialogFooter extends HTMLElement {
  constructor () {
    super()

    this.state = reactive({
      shortcut: '',
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

    this.classList.add('dialog-footer')
  }
}

function template ({shortcut}) {
  return html`
    <style>${componentStyles}</style>
    <div class="d-flex">
      <div class="d-flex flex-fill">
        <button
          type="button"
          class="btn btn-sm btn-actions"
          title="Briskine dialog actions"
          data-b-modal="actions"
          >
          ${unsafeSVG(iconBriskine)}
        </a>
      </div>

      <div
        class="dialog-shortcut btn text-secondary"
        title="Press ${shortcut} in any text field to open the Briskine dialog"
        >
        ${shortcut}
      </div>
      <button
        type="button"
        class="btn btn-sm btn-settings"
        title="Dialog settings"
        data-b-modal="settings"
        >
        ${unsafeSVG(iconGear)}
      </button>
    </div>
  `
}
