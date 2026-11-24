/* globals ENV */
import {getTemplates, isFreePlan} from '../../store/store-content.js'
import parseContext from './parse-context.js'
import PremiumError from './premium-error.js'
import debug from '../../debug.js'

import briskbars from '../../briskbars/briskbars.js'

import createMoment from '../helpers/moment.js'
import text from '../helpers/text.js'
import list from '../helpers/list.js'
import {capitalize, capitalizeAll} from '../helpers/capitalize.js'
import or from '../helpers/or.js'
import and from '../helpers/and.js'
import compare from '../helpers/compare.js'
import createRandom from '../helpers/random.js'
import cursor from '../helpers/cursor.js'
import createCss from '../helpers/css.js'
import createSite from '../helpers/site.js'
import createEachSite from '../helpers/each-site.js'
import createHidden from '../helpers/hidden.js'
import createForm, { isGeneratedKey } from '../helpers/form.js'
import carryOver from '../form/carry-over.js'

import moment from 'moment/min/moment-with-locales.js'

const helpers = {
  text,
  list,
  capitalize,
  capitalizeAll,
  or,
  and,
  compare,
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

async function checkFree () {
  try {
    return await isFreePlan()
  } catch (err) {
    if (err !== 'logged-out') {
      debug(['checkFree', err], 'warn')
    }

    // logged-out is premium in development
    return ENV !== 'development'
  }
}

// everything that has to stay the same between renders of a template,
// so the form preview, the inserted template and the plugin fields match.
export async function createSession (data = {}) {
  let free
  return {
    context: await parseContext(data),
    partials: await getPartials(),
    now: moment(),
    // random numbers per template,
    // so the body and the extra fields get different randoms.
    randoms: new Map(),
    cache: {
      site: new Map(),
      eachSite: new Map(),
      css: new Map(),
    },
    // field values by key. Fields with an id are available as @form.
    values: {},
    // fields from the last render
    fields: new Map(),
    // short ids for template texts and loop item paths, for field keys
    ids: new Map(),
    // fields without an id from the last render of each template,
    // to carry values over to loop items whose text was edited
    records: new Map(),
    // set when only text fields changed since the last render
    textEdit: false,
    // checked only when a template has fields
    isFree: () => free ??= checkFree(),
  }
}

// only the fields with an id
function formData (values = {}) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => !isGeneratedKey(key)))
}

// mode is form, to render form fields, or final, to render their values
export async function renderTemplate (template = '', session, mode = 'final') {
  const fields = new Map()
  const records = []
  const randoms = session.randoms.get(template) ?? []
  session.randoms.set(template, randoms)
  const renderHelpers = {
    ...helpers,
    moment: createMoment(session.now),
    random: createRandom(randoms),
    site: createSite(session.cache.site),
    eachSite: createEachSite(session.cache.eachSite),
    css: createCss(session.cache.css),
    hidden: createHidden(mode),
    ...createForm({
      values: session.values,
      fields,
      records,
      ids: session.ids,
      mode,
      isFree: session.isFree,
    }),
  }

  const html = await briskbars(template, session.context, {
    helpers: renderHelpers,
    partials: session.partials,
    data: {form: formData(session.values)},
  })

  // fields shown for the first time start with their default
  for (const [id, field] of fields) {
    if (!Object.hasOwn(session.values, id)) {
      session.values[id] = field.default
    }
  }
  session.fields = fields

  // after a text edit, loop items whose text changed take the value
  // of the item that was at their position, then render again with it.
  const previous = session.records.get(template)
  session.records.set(template, records)
  if (session.textEdit && previous) {
    session.textEdit = false
    const moves = carryOver(previous, records)
      .filter(([from]) => Object.hasOwn(session.values, from))
    if (moves.length) {
      moves.forEach(([from, to]) => session.values[to] = session.values[from])
      return renderTemplate(template, session, mode)
    }
  }
  session.textEdit = false

  return html
}

export default async function parseTemplate (template = '', data = {}, session) {
  try {
    return await renderTemplate(template, session || await createSession(data))
  } catch (err) {
    if (err instanceof PremiumError) {
      return err.message
    }

    // catch handlebars errors
    return `<pre>${err.message || err}</pre>`
  }
}
