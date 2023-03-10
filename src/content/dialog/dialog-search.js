import {render} from 'lit-html'
import {html, unsafeStatic} from 'lit-html/static.js'
import {classMap} from 'lit-html/directives/class-map.js'

import config from '../../config.js'
import {batch, reactive} from '../component.js'

export default class DialogSearch extends HTMLElement {
  constructor () {
    super()

    this.state = reactive({
      results: [],
      tags: [],
      extensionData: {
        dialogTags: true,
      },

    }, this, () => {
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
    // TODO use dialog-search
    this.classList.add('dialog-templates')
  }
}

function template ({
  results,
  tags,
  extensionData: {dialogTags},

  listComponent,
}) {
  return html`
    <div>
      <${listComponent}
        .list=${results}
        .showTags=${dialogTags}
        .tags=${tags}
        >
      </${listComponent}>
    </div>
  `
}
