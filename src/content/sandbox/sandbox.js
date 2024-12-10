// Sandbox script that runs in an iframe on Manifest v3,
// or directly in the page context on Manifest v2.
// Handlebars requires unsafe-eval to compile templates.
// Manifest v3 no longer allows the unsafe-eval CSP in the Content Script context,
// but does allow it in the Sandbox CSP.
// We use Channel Messaging to pass data from the content script context
// to the sandbox context, compile the templates here, and send them back to the content script.
// https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API

import {create  as handlebarsCreate} from 'handlebars'

import {respond} from './sandbox-messenger-client.js'
import config from '../../config.js'

// legacy date helper
import date from '../helpers/date.js'
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

function getHandlebars (partials = []) {
  const hbs = handlebarsCreate()

  // legacy helpers
  hbs.registerHelper('date', date)
  hbs.registerHelper('choice', choice)

  hbs.registerHelper('and', and)
  hbs.registerHelper('moment', moment)
  hbs.registerHelper('domain', domain)
  hbs.registerHelper('text', text)
  hbs.registerHelper('list', list)
  hbs.registerHelper('capitalize', capitalize)
  hbs.registerHelper('capitalizeAll', capitalizeAll)
  hbs.registerHelper('or', or)
  hbs.registerHelper('compare', compare)
  hbs.registerHelper('random', random)

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

respond(config.eventSandboxCompile, ({template, context, partials}) => {
  return compileTemplate(template, context, partials)
})
