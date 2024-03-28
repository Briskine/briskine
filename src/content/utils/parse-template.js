import {compileTemplate} from '../sandbox/sandbox-parent.js'
import store from '../../store/store-client.js'
import createContact from './create-contact.js'

const contactProps = ['email', 'name', 'first_name', 'last_name']
function mergeContacts (a = {}, b = {}) {
  const merged = {}
  contactProps.forEach((p) => merged[p] = b[p] || a[p] || '')
  return merged
}

// requires page refresh for account update
let accountCache = {}
async function getAccount (contextAccount = {}) {
  if (!Object.keys(accountCache).length) {
    try {
      accountCache = await store.getAccount()
    } catch (err) {
      // logged-out
    }
  }

  return createContact(mergeContacts(accountCache, contextAccount))
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

  context.account = await getAccount(context.account)
  // merge from details with account
  context.from = createContact(mergeContacts(context.account, context.from))

  return context
}

export default async function parseTemplate (template = '', data = {}) {
  const context = await parseContext(data)
  return compileTemplate(template, context)
}
