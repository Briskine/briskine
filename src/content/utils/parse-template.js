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

const senderPaths = {}
Array('from', 'account').forEach((p) => {
  senderPaths[p] = {}
  Object.keys(createContact()).forEach((c) => {
    senderPaths[p][c] = `${p}.${c}`
  })
})

const contactLists = ['to', 'cc', 'bcc']
function parseContext (data = {}) {
  const context = structuredClone(data)
  contactLists.forEach((p) => {
    const propData = Array.isArray(context[p] || []) ? context[p] : [context[p]]
    context[p] = contactsArray(propData)
  })

  // backwards compatibility with the from and account variables,
  // they are now using the async _sender helper under the hood
  context._briskineFrom = createContact(context.from)
  context._briskineAccount = createContact(context.account)
  context._briskineSenderPaths = senderPaths

  Array('from', 'account').forEach((p) => {
    context[p] = {}
    Object.keys(createContact()).forEach((c) => {
      context[p][c] = `{{ _sender _briskineFrom _briskineAccount _briskineSenderPaths.${p}.${c} }}`
    })
  })

  return context
}

export default function parseTemplate (template = '', data = {}) {
  const context = parseContext(data)
  return compileTemplate(template, context)
}
