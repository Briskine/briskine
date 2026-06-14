// Sandbox script that runs in an iframe on Manifest v3,
// or directly in the page context on Manifest v2.
// Handlebars requires unsafe-eval to compile templates.
// Manifest v3 no longer allows the unsafe-eval CSP in the Content Script context,
// but does allow it in the Sandbox CSP.
// We use Channel Messaging to pass data from the content script context
// to the sandbox context, compile the templates here, and send them back to the content script.
// https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API
//
// The Handlebars helpers (e.g. moment, cursor, text) are shared with the
// in-content AST renderer via `../helpers/index.js`. This keeps the two
// compilation paths behaviourally identical; the AST renderer is the new
// default in `parse-template.js`, and this sandbox is only invoked as a
// fallback when the template uses a feature the AST renderer does not yet
// support.

import {create  as handlebarsCreate} from 'handlebars'

import {respond} from './sandbox-messenger-client.js'
import { eventSandboxCompile } from '../../config.js'

import { sharedHelpers } from '../helpers/index.js'

function getHandlebars (partials = []) {
  const hbs = handlebarsCreate()

  hbs.registerHelper(sharedHelpers)

  if (partials?.length) {
    partials.forEach((p) => {
      hbs.registerPartial(p.shortcut, p.body)
    })
  }

  return hbs
}

export async function compileTemplate (template = '', context = {}, partials = []) {
  const hbs = getHandlebars(partials)
  try {
    return hbs.compile(template)(context)
  } catch (err) {
    // catch compilation errors like "missing helper" or "missing partial"
    return `<pre>${err.message || err}</pre>`
  }
}

respond(eventSandboxCompile, ({template, context, partials}) => {
  return compileTemplate(template, context, partials)
})
