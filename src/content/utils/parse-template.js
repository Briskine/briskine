import createContact from './create-contact.js'
import templateFeatures from './template-features.js'
import {getAccount as storeGetAccount, getTemplates} from  '../../store/store-content.js'

import briskbars, {parse} from '../../briskbars/briskbars.js'

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

async function compileTemplate (template = '', context = {}, partials = []) {
  try {
    const partialsMap = Object.fromEntries(partials.map((p) => [p.shortcut, p.body]))
    const output = await briskbars(template, context, { helpers, partials: partialsMap })
    return output
  } catch (err) {
    // catch compilation errors like "missing helper" or "missing partial"
    return `<pre>${err.message || err}</pre>`
  }
}

function mergeContacts (a = {}, b = {}) {
  const merged = {}
  Object.keys(createContact()).forEach((p) => merged[p] = b[p] || a[p] || '')
  return merged
}

async function getAccount (contextAccount = {}) {
  let accountCache = {}
  try {
    const storeAccount = await storeGetAccount()
    // map response to contact format
    accountCache = {
      name: storeAccount.full_name,
      email: storeAccount.email,
    }
  } catch {
    // logged-out
  }

  return mergeContacts(accountCache, contextAccount)
}

// return array of contacts, with the first contact exposed directly on the array.
// to.first_name and to.0.first_name will both work,
// but looping will only return array index items.
function contactsArray (contacts = []) {
  const context = []
  if (contacts.length) {
    // make sure each array item is a contact
    contacts.forEach((contact) => context.push(createContact(contact)))

    // expose the first contact's properties on the array
    Object.entries(context[0]).forEach(([key, value]) => context[key] = value)
  }

  return context
}

const contactLists = ['to', 'cc', 'bcc']
async function parseContext (data = {}) {
  const context = structuredClone(data)
  contactLists.forEach((p) => {
    const propData = Array.isArray(context[p] || []) ? context[p] : [context[p]]
    context[p] = contactsArray(propData)
  })

  context.account = createContact(await getAccount(context.account))
  // merge from details with account
  context.from = createContact(mergeContacts(context.account, context.from))

  return context
}

export default async function parseTemplate (template = '', data = {}) {
  let ast
  try {
    ast = parse(template)
  } catch (err) {
    // catch syntax errors
    return `<pre>${err.message || err}</pre>`
  }

  const features = templateFeatures(ast)
  const context = await parseContext(data)
  let partials = []
  if (features.partials) {
    const templates = await getTemplates()
    partials = templates
      .filter((t) => t.shortcut?.trim?.() && t.body !== template)
      .map((t) => ({ shortcut: t.shortcut, body: t.body }))
  }

  return compileTemplate(ast, context, partials)
}
