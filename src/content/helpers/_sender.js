import Handlebars from 'handlebars'
import createContact from '../utils/create-contact.js'
import {helper} from '../utils/async-helpers.js'
import {request} from '../sandbox/sandbox-messenger-client.js'

function mergeContacts (a = {}, b = {}) {
  const merged = {}
  Object.keys(createContact()).forEach((p) => merged[p] = b[p] || a[p] || '')
  return merged
}

// requires page refresh for account update
let accountCache = {}
async function getAccount (contextAccount = {}) {
  if (!Object.keys(accountCache).length) {
    try {
      const storeAccount = await request('helper-_sender-account')
      // map response to contact format
      accountCache = {
        name: storeAccount.full_name,
        email: storeAccount.email,
      }
    } catch {
      // logged-out
    }
  }

  return mergeContacts(accountCache, contextAccount)
}

async function _sender (obj = {}, key ='', _from ={}, _account = {}) {
  const response = {}
  response.account = await getAccount(_account)
  // merge from details with account
  response.from = mergeContacts(response.account, _from)

  return createContact(response[obj])[key]
}

function _senderWrapper (parent, key) {
  return function () {
    const {from, account} = this
    return _sender(parent, key, from, account)
  }
}

Array('from', 'account').forEach((parent) => {
  Object.keys(createContact()).forEach((key) => {
    Handlebars.registerHelper(`_${parent}_${key}`, helper(_senderWrapper(parent, key)))
  })
})
