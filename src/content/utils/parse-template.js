import {getTemplates} from '../../store/store-content.js'
import parseContext from './parse-context.js'

import briskbars from '../../briskbars/briskbars.js'

import moment from '../helpers/moment.js'
import text from '../helpers/text.js'
import list from '../helpers/list.js'
import {capitalize, capitalizeAll} from '../helpers/capitalize.js'
import or from '../helpers/or.js'
import and from '../helpers/and.js'
import compare from '../helpers/compare.js'
import random from '../helpers/random.js'
import cursor from '../helpers/cursor.js'
import createCss from '../helpers/css.js'
import createSite from '../helpers/site.js'
import createEachSite from '../helpers/each-site.js'

const helpers = {
  moment,
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

// cache partials because lots of templates can get expensive
let partialsSource = null
let partialsMap = {}
function cachePartials (templates = []) {
  partialsSource = templates
  partialsMap = {}

  for (const t of templates) {
    // skip templates with no shortcut
    if (t.shortcut?.trim?.()) {
      partialsMap[t.shortcut] = t.body
    }
  }
}

async function getPartials () {
  let templates = []
  try {
    templates = await getTemplates()
  } catch {
    // can't get templates for some reason,
    // logged-out will still return default templates.
  }

  if (templates !== partialsSource) {
    cachePartials(templates)
  }

  return partialsMap
}

export default async function parseTemplate (template = '', data = {}) {
  const context = await parseContext(data)
  const partials = await getPartials()
  const renderHelpers = {...helpers, site: createSite(), eachSite: createEachSite(), css: createCss()}

  try {
    return await briskbars(template, context, { helpers: renderHelpers, partials })
  } catch (err) {
    // catch handlebars errors
    return `<pre>${err.message || err}</pre>`
  }
}
