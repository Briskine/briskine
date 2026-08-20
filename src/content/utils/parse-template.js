import createContact from './create-contact.js'
import {getAccount as storeGetAccount, getTemplates} from  '../../store/store-content.js'

import briskbars from '../../briskbars/briskbars.js'

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

async function getPartials (template = '') {
  let templates = []
  try {
    templates = await getTemplates()
  } catch {
    // logged-out, or templates not available
  }

  return Object.fromEntries(
    templates
      // exclude the current template, and templates with no shortcut
      .filter((t) => t.shortcut?.trim?.() && t.body !== template)
      .map((t) => [t.shortcut, t.body])
  )
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
  const context = {...data}
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
  const context = await parseContext(data)
  const partials = await getPartials(template)

  try {
    return await briskbars(template, context, { helpers, partials })
  } catch (err) {
    // catch handlebars errors
    return `<pre>${err.message || err}</pre>`
  }
}
