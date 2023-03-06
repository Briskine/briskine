import {render, html} from 'lit-html'
import {classMap} from 'lit-html/directives/class-map.js'
import {repeat} from 'lit-html/directives/repeat.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import iconArrowUpRightSquare from 'bootstrap-icons/icons/arrow-up-right-square.svg?raw'

import config from '../../config.js'

const activeTemplateClass = 'active'

export default class DialogTemplates extends HTMLElement {
  constructor () {
    super()

    this.state = {
      loading: false,
      templates: [],
      activeItem: '',
      showTags: true,
    }

    this.render = () => {
      render(template(this.state), this)
    }

    Object.keys(this.state).forEach((key) => {
      Object.defineProperty(this, key, {
        set (value) {
          if (this.state[key] !== value) {
            this.state[key] = value
            this.render()
          }
        }
      })
    })
  }
  connectedCallback () {
    if (!this.isConnected) {
      return
    }

    this.render()

    this.classList.add('dialog-templates')
  }
}

function template ({
  loading = false,
  templates = [],
  activeItem = '',
  showTags = true,
  tags = [],
}) {
  return html`
    <ul>
      ${loading === true
        ? Array(4).fill(html`
          <div class="templates-placeholder">
            <div class="templates-placeholder-text"></div>
            <div class="templates-placeholder-text templates-placeholder-description"></div>
          </div>
        `)
        : templates.length
        ? repeat(templates, (t) => t.id, (t) => {
            return html`
              <li
                data-id=${t.id}
                class=${classMap({
                  'dialog-template-item': true,
                  [activeTemplateClass]: t.id === activeItem,
                })}
                >
                <div class="d-flex">
                  <h1>${t.title}</h1>
                  ${t.shortcut ? html`
                    <abbr>${t.shortcut}</abbr>
                  ` : ''}
                </div>
                <p>${t._body_plaintext.slice(0, 100)}</p>
                ${showTags && t.tags && t.tags.length ? html`
                  <ul class="dialog-tags">
                    ${repeat(t.tags, (tagId) => tagId, (tagId) => {
                      const tag = tags.find((tag) => tag.id === tagId)
                      if (!tag) {
                        return ''
                      }

                      return html`
                        <li
                          style="--tag-bg-color: var(--tag-color-${tag.color})"
                          class=${classMap({
                            'text-secondary': !tag.color || tag.color === 'transparent',
                          })}
                        >
                          ${tag.title}
                        </li>
                      `
                    })}
                  </ul>
                ` : ''}
                <div class="edit-container">
                  <a
                    href="${config.functionsUrl}/template/${t.id}"
                    target="_blank"
                    class="btn btn-sm btn-edit dialog-safari-hide"
                    title="Edit template"
                    >
                    ${unsafeSVG(iconArrowUpRightSquare)}
                  </a>
                </div>
              </li>
            `
          })
        : html`
          <div class="templates-no-results">
            No templates found
          </div>
        `}
    </ul>
  `
}
