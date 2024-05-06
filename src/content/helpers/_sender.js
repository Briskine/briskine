import Handlebars from 'handlebars'
import store from '../../store/store-client.js'
import createContact from '../utils/create-contact.js'
import {helper} from '../utils/async-helpers.js'

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
      const storeAccount = await store.getAccount()
      // map response to contact format
      accountCache = {
        name: storeAccount.full_name,
        email: storeAccount.email,
      }
    } catch (err) {
      // logged-out
    }
  }

  return createContact(mergeContacts(accountCache, contextAccount))
}

async function _sender (...args) {
  const params = args.slice(0, args.length - 1)
  const [from, account, path] = params
  const [obj, key] = path.split('.')

  const response = {}
  response.account = await getAccount(account)
  // merge from details with account
  response.from = createContact(mergeContacts(response.account, from))

  return response[obj][key]
}

Handlebars.registerHelper('_sender', helper(_sender))
