// Sandbox script that runs in an iframe on Manifest v3,
// or directly in the page context on Manifest v2.
// Handlebars requires unsafe-eval to compile templates.
// Manifest v3 no longer allows the unsafe-eval CSP in the Content Script context,
// but does allow it in the Sandbox CSP.
// We use Channel Messaging to pass data from the content script context
// to the sandbox context, compile the templates here, and send them back to the content script.
// https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API

import briskbars from '../../briskbars/briskbars.js'

import {respond} from './sandbox-messenger-client.js'
import { eventSandboxCompile } from '../../config.js'

// legacy choice helper
import choice from '../helpers/choice.js'

import moment from '../helpers/moment.js'
import domain from '../helpers/domain.js'
import text from '../helpers/text.js'
import list from '../helpers/list.js'
import {capitalize, capitalizeAll} from '../helpers/capitalize.js'
import or from '../helpers/or.js'
import and from '../helpers/and.js'
import compare from '../helpers/compare.js'
import random from '../helpers/random.js'
import cursor from '../helpers/cursor.js'

const helpers = {
  choice,

  moment,
  domain,
  text,
  list,
  capitalize,
  capitalizeAll,
  or,
  and,
  compare,
  random,
  cursor,
}

export async function compileTemplate (template = '', context = {}, partials = []) {
  try {
    const partialsMap = Object.fromEntries(partials.map((p) => [p.shortcut, p.body]))
    return briskbars(template, context, { helpers, partials: partialsMap })
  } catch (err) {
    // catch compilation errors like "missing helper" or "missing partial"
    return `<pre>${err.message || err}</pre>`
  }
}

respond(eventSandboxCompile, ({template, context, partials}) => {
  return compileTemplate(template, context, partials)
})
