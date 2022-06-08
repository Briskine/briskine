// TODO explain

import Handlebars from 'handlebars'

import '../helpers/content-helpers.js'
import config from '../../config.js'

window.addEventListener('message', (e) => {
  if (e.data.type === config.eventSandboxCompile) {
    let compiledTemplate = ''
    try {
      compiledTemplate = Handlebars.compile(e.data.template)(e.data.context)
    } catch (err) {
      compiledTemplate = `<pre>${err.message || err}</pre>`
    }

    e.source.postMessage({
      type: config.eventSandboxCompile,
      template: compiledTemplate,
    }, e.origin)
  }
})

