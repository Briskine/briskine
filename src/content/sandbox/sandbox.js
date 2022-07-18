// Sandbox script that runs in an iframe on Manifest v3,
// or directly in the page context on Manifest v2.
// Handlebars requires unsafe-eval to compile templates.
// Manifest v3 no longer allows the unsafe-eval CSP in the Content Script context,
// but does allow it in the Sandbox CSP.
// We use Channel Messaging to pass data from the content script context
// to the sandbox context, compile the templates here, and send them back to the content script.
// https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API

import Handlebars from 'handlebars'

import '../helpers/content-helpers.js'
import config from '../../config.js'

let port2

function handleInitMessage (e) {
  if (e.data.type === 'init') {
    port2 = e.ports[0]
    port2.onmessage = onMessage
    window.removeEventListener('message', handleInitMessage)
  }
}

window.addEventListener('message', handleInitMessage)

export function compileTemplate (template = '', context = {}) {
  try {
    return Handlebars.compile(template)(context)
  } catch (err) {
    return `<pre>${err.message || err}</pre>`
  }
}

function onMessage (e) {
  if (e.data.type === config.eventSandboxCompile) {
    port2.postMessage({
      type: config.eventSandboxCompile,
      template: compileTemplate(e.data.template, e.data.context),
    })
  }
}
