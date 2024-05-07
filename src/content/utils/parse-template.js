import {compileTemplate} from '../sandbox/sandbox-parent.js'
import createContact from './create-contact.js'

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

  // backwards-compatibility for the account and from variables
  const _from = structuredClone(context.from)
  const _account = structuredClone(context.account)
  for (const p of ['from', 'account']) {
    context[p] = {}
    for (const c in createContact()) {
      context[p][c] = await compileTemplate(`{{ _${p}_${c} }}`, {from: _from, account: _account})
    }
  }

  return context
}

export default async function parseTemplate (template = '', data = {}) {
  const context = await parseContext(data)
  return compileTemplate(template, context)
}
