// Sandbox script that runs in an iframe on Manifest v3,
// or directly in the page context on Manifest v2.
// Handlebars requires unsafe-eval to compile templates.
// Manifest v3 no longer allows the unsafe-eval CSP in the Content Script context,
// but does allow it in the Sandbox CSP.
// We use Channel Messaging to pass data from the content script context
// to the sandbox context, compile the templates here, and send them back to the content script.
// https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API

import Handlebars from 'handlebars'

import {respond} from './sandbox-messenger-client.js'
import config from '../../config.js'
import {resolveAsyncHelpers} from '../utils/async-helpers.js'

// legacy date helper
import '../helpers/date.js'

import '../helpers/moment.js'
import '../helpers/choice.js'
import '../helpers/domain.js'
import '../helpers/text.js'
import '../helpers/list.js'
import '../helpers/capitalize.js'
import '../helpers/or.js'
import '../helpers/and.js'
import '../helpers/compare.js'
import '../helpers/random.js'
import '../helpers/_sender.js'

export async function compileTemplate (template = '', context = {}) {
  try {
    let compiled = Handlebars.compile(template)(context)
    compiled = await resolveAsyncHelpers(compiled)
    return compiled
  } catch (err) {
    return `<pre>${err.message || err}</pre>`
  }
}

respond(config.eventSandboxCompile, ({template, context}) => {
  return compileTemplate(template, context)
})
