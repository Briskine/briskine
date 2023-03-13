import {render} from 'lit-html'
import {html, unsafeStatic} from 'lit-html/static.js'

import {batch, reactive} from '../component.js'

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

    this.state = reactive({
      loggedIn: false,
      loading: false,
      templates: [],

      extensionData: {
        dialogTags: true,
        dialogSort: 'last_used',
        templatesLastUsed: {},
      },

      tags: [],

      _templates: [],
    }, this, (key, value, props) => {
      if (['templates', 'extensionData'].includes(key)) {
        props._templates = sortTemplates(
          props.templates,
          props.extensionData.dialogSort,
          props.extensionData.templatesLastUsed,
        )
      }

      this.render()
    })

    this.render = batch(() => {
      render(template({listComponent: this.listComponent, ...this.state}), this)
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
  }
}

function template ({
  loggedIn,
  loading,
  tags,
  extensionData: {dialogTags},

  _templates,

  listComponent,
}) {
  return html`
    ${loading === true
      ? Array(4).fill(html`
        <div class="templates-placeholder">
          <div class="templates-placeholder-text"></div>
          <div class="templates-placeholder-text templates-placeholder-description"></div>
        </div>
      `)
      : html`
        <${listComponent}
          .loggedIn=${loggedIn}
          .list=${_templates}
          .showTags=${dialogTags}
          .tags=${tags}
          >
        </${listComponent}>
      `
    }
  `
}
