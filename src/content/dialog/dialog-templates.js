import {render} from 'lit-html'
import {html, unsafeStatic} from 'lit-html/static.js'
import {classMap} from 'lit-html/directives/class-map.js'
import {repeat} from 'lit-html/directives/repeat.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'
import iconArrowUpRightSquare from 'bootstrap-icons/icons/arrow-up-right-square.svg?raw'

import config from '../../config.js'

function sortTemplates (templates = [], sort = 'last_used', lastUsed = {}) {
  if (['title', 'shortcut'].includes(sort)) {
    return templates
      .sort((a, b) => {
        return a[sort].localeCompare(b[sort])
      })
  }

  if (sort === 'modified_datetime') {
    return templates
      .sort((a, b) => {
        return new Date(b.modified_datetime || 0) - new Date(a.modified_datetime || 0)
      })
  }

  // default last_used sort
  return templates
    .sort((a, b) => {
      return new Date(lastUsed[b.id] || 0) - new Date(lastUsed[a.id] || 0)
    })
}


export default class DialogTemplates extends HTMLElement {
  constructor () {
    super()

    this.state = {
      loading: false,
      templates: [],

      extensionData: {
        dialogTags: true,
        dialogSort: 'last_used',
        templatesLastUsed: {},
      },

      tags: [],

      _templates: [],
    }

    let renderRequested = false
    this.render = async () => {
      // lit-element style batched updates
      if (!renderRequested) {
        renderRequested = true
        renderRequested = await false
        render(template({listComponent: this.listComponent, ...this.state}), this)
      }
    }

    Object.keys(this.state).forEach((key) => {
      Object.defineProperty(this, key, {
        set (value) {
          if (this.state[key] !== value) {
            this.state[key] = value

            if (['templates', 'extensionData'].includes(key)) {
              this.state._templates = sortTemplates(
                this.state.templates,
                this.state.extensionData.dialogSort,
                this.state.extensionData.templatesLastUsed,
              ).slice(0, 42)
            }

            this.render()
          }
        },
        get () {
          return this.state[key]
        }
      })
    })
  }
  set listComponentTagName (value) {
    this.listComponent = unsafeStatic(value)
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
  loading,
  tags,
  extensionData: {dialogTags},

  _templates,

  listComponent,
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
        : html`
          <${listComponent}
            .list=${_templates}
            .showTags=${dialogTags}
            .tags=${tags}
            >
          </${listComponent}>
        `
      }
    </ul>
  `
}
