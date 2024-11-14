/* globals MANIFEST
 */
import {compileTemplate} from '../sandbox/sandbox-parent.js'
import createContact from './create-contact.js'
import templateFeatures from './template-features.js'
import {getAccount as storeGetAccount} from  '../../store/store-content.js'

let compileTemplateLegacy = async () => {}
if (MANIFEST === '2') {
  const sandbox = await import(
    /* webpackMode: "eager" */
    '../sandbox/sandbox.js'
  )
  compileTemplateLegacy = sandbox.compileTemplate
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
async function parseContext (data = {}, features = {}) {
  const context = structuredClone(data)
  contactLists.forEach((p) => {
    const propData = Array.isArray(context[p] || []) ? context[p] : [context[p]]
    context[p] = contactsArray(propData)
  })

  // add account or from to the context only if they're used in the template
  if (features.account || features.from) {
    context.account = createContact(await getAccount(context.account))
    // merge from details with account
    context.from = createContact(mergeContacts(context.account, context.from))
  }

  return context
}

export default async function parseTemplate (template = '', data = {}) {
  const features = templateFeatures(template)
  const context = await parseContext(data, features)

  if (MANIFEST === '2') {
    return compileTemplateLegacy(template, context)
  }
  return compileTemplate(template, context)
}
