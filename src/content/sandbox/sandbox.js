// TODO explain

import Handlebars from 'handlebars'

import '../helpers/content-helpers.js'
import config from '../../config.js'

let port2

window.addEventListener('message', (e) => {
  if (e.data.type === 'init') {
    port2 = e.ports[0]
    port2.onmessage = onMessage
  }
})

function onMessage (e) {
  if (e.data.type === config.eventSandboxCompile) {
    let compiledTemplate = ''
    try {
      compiledTemplate = Handlebars.compile(e.data.template)(e.data.context)
    } catch (err) {
      compiledTemplate = `<pre>${err.message || err}</pre>`
    }

    port2.postMessage({
      type: config.eventSandboxCompile,
      template: compiledTemplate,
    })
  }
}
