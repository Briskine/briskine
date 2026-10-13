import {getTemplates, getAccount, getCustomer} from '../../store/store-content.js'
import parseContext from './parse-context.js'
import PremiumError from './premium-error.js'

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
import createForm from '../helpers/form.js'

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
    const account = await getAccount()
    const customer = await getCustomer(account.customer)
    const plan = customer?.subscription?.plan
    return !plan || plan === 'free'
  } catch {
    // logged-out
    return true
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
    randoms: [],
    cache: {
      site: new Map(),
      eachSite: new Map(),
      css: new Map(),
    },
    // field values by id, available as @form
    values: {},
    // fields from the last render
    fields: new Map(),
    // checked only when a template has fields
    isFree: () => free ??= checkFree(),
  }
}

// mode is form, to render form fields, or final, to render their values
export async function renderTemplate (template = '', session, mode = 'final') {
  const fields = new Map()
  const renderHelpers = {
    ...helpers,
    moment: createMoment(session.now),
    random: createRandom(session.randoms),
    site: createSite(session.cache.site),
    eachSite: createEachSite(session.cache.eachSite),
    css: createCss(session.cache.css),
    hidden: createHidden(mode),
    ...createForm({
      values: session.values,
      fields,
      mode,
      isFree: session.isFree,
    }),
  }

  const html = await briskbars(template, session.context, {
    helpers: renderHelpers,
    partials: session.partials,
    data: {form: session.values},
  })

  // fields shown for the first time start with their default
  for (const [id, field] of fields) {
    if (!Object.hasOwn(session.values, id)) {
      session.values[id] = field.default
    }
  }
  session.fields = fields

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
