import {render, html} from 'lit-html'
import {classMap} from 'lit-html/directives/class-map.js'
import {repeat} from 'lit-html/directives/repeat.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import iconArrowUpRightSquare from 'bootstrap-icons/icons/arrow-up-right-square.svg?raw'

import config from '../../config.js'

const activeTemplateClass = 'active'

export default class DialogList extends HTMLElement {
  constructor () {
    super()

    this.state = {
      list: [],

      showTags: true,
      tags: [],

      _active: '',
    }

    let renderRequested = false
    this.render = async () => {
      // lit-element style batched updates
      if (!renderRequested) {
        renderRequested = true
        renderRequested = await false
        render(template(this.state), this)
      }
    }

    Object.keys(this.state).forEach((key) => {
      Object.defineProperty(this, key, {
        set (value) {
          if (this.state[key] !== value) {
            this.state[key] = value

            // TODO default select first item
            if (
              key === 'list'
              && this.state.list.length
              && !this.state.list.find((item) => item.id === this.state._active)
            ) {
              this.state._active = this.state.list[0].id
            }

            this.render()
          }
        },
        get () {
          return this.state[key]
        }
      })
    })

    this.setActive = (id = '', scrollIntoView = false) => {
      if (scrollIntoView) {
        const newActive = this.querySelector(`[data-id="${id}"]`)
        if (newActive) {
          newActive.scrollIntoView({block: 'nearest'})
        }
      }
      return id
    }

  }
  connectedCallback () {
    if (!this.isConnected) {
      return
    }

    this.render()
    this.classList.add('dialog-list')

    // hover templates
    this.addEventListener('mouseover', (e) => {
      const container = e.target.closest('[data-id]')
      if (container) {
        this._active = this.setActive(container.dataset.id)

        // add the title attribute only when hovering the template.
        // speeds up rendering the template list.
        const template = this.state.list.find((t) => t.id === container.dataset.id)
        if (template) {
          container.title = template._body_plaintext
        }
      }
    })

    // insert templates on click
    this.addEventListener('click', (e) => {
      const container = e.target.closest('[data-id]')
      // prevent inserting templates when clicking the edit button
      const editButton = e.target.closest('.btn-edit')
      if (container && !editButton) {
        this.dispatchEvent(new CustomEvent('b-dialog-insert-template', {
          bubbles: true,
          composed: true,
          detail: container.dataset.id,
        }))
      }
    })

    this.addEventListener('b-dialog-select-next', () => {
      console.log('next')
      const index = this.state.list.findIndex((t) => t.id === this._active)
      console.log(index)
      if (this.state.list[index + 1]) {
        this._active = this.setActive(this.state.list[index + 1].id, true)
      }
    })
  }
}

function template ({
  showTags,
  tags,
  list,

  _active,
}) {
  return html`
    <ul>
      ${list.length
        ? repeat(list, (t) => t.id, (t) => {
            return html`
              <li
                data-id=${t.id}
                class=${classMap({
                  'dialog-template-item': true,
                  [activeTemplateClass]: t.id === _active,
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
