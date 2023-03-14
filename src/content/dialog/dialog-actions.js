/* globals VERSION */
import {render, html} from 'lit-html'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import iconPlusSquare from 'bootstrap-icons/icons/plus-square.svg?raw'
import iconArchive from 'bootstrap-icons/icons/archive.svg?raw'
import iconQuestionCircle from 'bootstrap-icons/icons/question-circle.svg?raw'
import iconTwitter from 'bootstrap-icons/icons/twitter.svg?raw'
import iconGlobe from 'bootstrap-icons/icons/globe.svg?raw'

import config from '../../config.js'

export default class DialogActions extends HTMLElement {
  constructor () {
    super()

    this.render = () => {
      render(template(), this)
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

const actions = [
  {
    title: 'New template',
    icon: unsafeSVG(iconPlusSquare),
    href: `${config.functionsUrl}/template/new`,
  },
  {
    title: 'Manage templates',
    icon: unsafeSVG(iconArchive),
    href: config.functionsUrl,
  },
  {
    title: 'Help Center',
    icon: unsafeSVG(iconQuestionCircle),
    href: config.helpUrl,
  },
  {
    title: 'Briskine website',
    icon: unsafeSVG(iconGlobe),
    href: config.websiteUrl,
  },
  {
    title: 'Follow us on Twitter',
    icon: unsafeSVG(iconTwitter),
    href: 'https://twitter.com/briskineapp',
  },
]

function template () {
  return html`
    <div class="dialog-actions dialog-modal">
      <div class="dialog-modal-header">
        <h2 class="text-secondary">
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
        <ul class="list-group">
          ${actions.map((action) => html`
            <li>
              <a
                href=${action.href}
                target="_blank"
                class="btn d-flex flex-fill"
                >
                <span class="list-group-icon">${action.icon}</span>
                <span>${action.title}</span>
              </a>
            </li>
          `)}
        </ul>
      </div>
    </div>
  `
}
