import {render, html} from 'lit-html'
import {classMap} from 'lit-html/directives/class-map.js'
import {repeat} from 'lit-html/directives/repeat.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import iconArrowUpRightSquare from 'bootstrap-icons/icons/arrow-up-right-square.svg?raw'

import config from '../../config.js'
import {batch, reactive} from '../component.js'

const activeTemplateClass = 'active'
const templateRenderLimit = 42

export default class DialogList extends HTMLElement {
  constructor () {
    super()

    this.state = reactive({
      list: [],

      showTags: true,
      tags: [],

      _active: '',
    }, this, (key, value, props) => {
      // render less items, for performance
      if (key === 'list') {
        props.list = props.list.slice(0, templateRenderLimit)

        // select first item when list changes,
        // and current item not in list.
        if (
          props.list.length
          && !props.list.find((item) => item.id === props._active)
        ) {
          props._active = this.setActive(props.list[0].id)
        }
      }

      this.render()
    })

    this.render = batch(() => {
      render(template(this.state), this)
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

    // keyboard navigation
    this.addEventListener('b-dialog-select', (e) => {
      const index = this.state.list.findIndex((t) => t.id === this._active)
      const move = e.detail
      let nextIndex

      if (move === 'next') {
        nextIndex = index + 1
      } else if (move === 'previous') {
        nextIndex = index - 1
      }

      if (nextIndex && this.state.list[nextIndex]) {
        this._active = this.setActive(this.state.list[nextIndex].id, true)
      }
    })

    // insert templates on click
    this.addEventListener('click', (e) => {
      const container = e.target.closest('[data-id]')
      // prevent inserting templates when clicking the edit button
      const editButton = e.target.closest('.btn-edit')
      if (container && !editButton) {
        this.dispatchEvent(new CustomEvent('b-dialog-insert', {
          bubbles: true,
          composed: true,
          detail: container.dataset.id,
        }))
      }
    })

    // insert with enter
    this.addEventListener('b-dialog-select-active', () => {
      this.dispatchEvent(new CustomEvent('b-dialog-insert', {
        composed: true,
        detail: this._active,
      }))
    })

    // select first item
    this.addEventListener('b-dialog-select-first', () => {
      if (this.state.list.length) {
        this._active = this.setActive(this.state.list[0].id)
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
