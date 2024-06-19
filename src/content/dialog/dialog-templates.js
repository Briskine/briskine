import {render} from 'lit-html'
import {html, unsafeStatic} from 'lit-html/static.js'

import sortTemplates from '../../store/sort-templates.js'
import {batch, reactive} from '../component.js'

export default class DialogTemplates extends HTMLElement {
  constructor () {
    super()

    this.listComponent = ''

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
      listComponentTagName: '',

      _templates: [],
    }, this, (key, value, props) => {
      if (['templates', 'extensionData'].includes(key)) {
        props._templates = sortTemplates(
          props.templates,
          props.extensionData.dialogSort,
          props.extensionData.templatesLastUsed,
        )
      }

      if (key === 'listComponentTagName') {
        this.listComponent = unsafeStatic(value)
      }

      this.render()
    })

    this.render = batch(() => {
      render(template({listComponent: this.listComponent, ...this.state}), this)
    })
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
