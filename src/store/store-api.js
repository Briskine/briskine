/* globals ENV, FIREBASE_CONFIG */
import browser from 'webextension-polyfill'

import {initializeApp} from 'firebase/app'
import {
  initializeAuth,
  indexedDBLocalPersistence,
  connectAuthEmulator,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth/web-extension'
import {
  initializeFirestore,
  connectFirestoreEmulator,
  collection,
  query,
  where,
  getDocs,
  documentId,
  and,
  or,
  limit,
  orderBy,
} from 'firebase/firestore/lite'

import { functionsUrl, freeTemplatesLimit }  from '../config.js'
import trigger from '../background/background-trigger.js'
import fuzzySearch from './search.js'
import {badgeUpdate} from '../background/badge.js'
import {getDefaultTemplates, defaultTags, defaultSettings} from './default-data.js'
import htmlToText from '../content/utils/html-to-text.js'
import {getExtensionData, setExtensionData} from './extension-data.js'
import debug from '../debug.js'

export {getExtensionData, setExtensionData} from './extension-data.js'
export {openPopup} from '../background/open-popup.js'

const firebaseApp = initializeApp(FIREBASE_CONFIG)
const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: [
    indexedDBLocalPersistence,
  ],
})
const db = initializeFirestore(firebaseApp, {})

// development emulators
if (ENV === 'development') {
  connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 5002)
}


async function clearDataCache () {
  userChanged()

  // cache data that we want to keep between login sessions
  const extensionData = await getExtensionData()
  const words = extensionData.words
  const bubbleAllowlist = extensionData.bubbleAllowlist

  await browser.storage.local.clear()
  userChanged()

  // restore data between logins
  return setExtensionData({
    words,
    bubbleAllowlist,
  })
}

function convertToNativeDates (obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      value?.toDate?.() ?? value,
    ])
  )
}

const templateConverter = {
  fromFirestore: (snapshot) => convertToNativeDates(snapshot.data()),
  toFirestore: (data) => data,
}
const templatesCollection = collection(db, 'templates').withConverter(templateConverter)


async function templatesQuery (user) {
  // isFree will load the customers collection
  const free = await isFree(user)

  if (free) {
    return query(
      templatesCollection,
      where('customer', '==', user.customer),
      where('deleted_datetime', '==', null),
      where('owner', '==', user.id),

      orderBy('created_datetime'),
      limit(freeTemplatesLimit),
    )
  }

  return query(
      templatesCollection,
      and(
        where('customer', '==', user.customer),
        where('deleted_datetime', '==', null),
        or(
          where('owner', '==', user.id),
          // this will also match owned templates,
          // but firestore handles deduplication.
          where('sharing', '==', 'everyone'),
          and(
            where('sharing', '==', 'custom'),
            where('shared_with', 'array-contains', user.id),
          )
        )
      )
    )
}

const allCollections = [
  'users',
  'customers',
  'tags',
  'templates',
]

function getCollectionQuery (name, user) {
  const collectionQuery = {
    users: [documentId(), '==', user.id],
    customers: ['members', 'array-contains', user.id],
    tags: ['customer', '==', user.customer]
  }

  if (name === 'templates') {
    return templatesQuery(user)
  }

  return query(
    collection(db, name),
    where(...collectionQuery[name]),
  )
}

// incremented when the signed in user or the active customer changes,
// so requests started before the change don't update the cache.
let userGeneration = 0

function userChanged () {
  userGeneration = userGeneration + 1
}

// collections that belong to the active customer
const customerCollections = ['templates', 'tags']

const collectionRequestQueue = {}

// force skips the cache, and only replaces it when the request succeeds.
async function getCollection ({ collection, user, force = false }) {
  const generation = user.generation ?? userGeneration

  // cached data doesn't wait for a refresh in progress (e.g., on a slow connection)
  if (!force) {
    const cache = await browser.storage.local.get(collection)
    if (cache[collection]) {
      return cache[collection]
    }
  }

  // request is already in progress.
  // only shared between callers that read the same user and customer,
  // since every change to them increments the generation.
  const key = `${collection}:${generation}`
  const pending = collectionRequestQueue[key]
  if (pending && !force) {
    return pending
  }

  // the pending request could use an outdated query (e.g., the previous plan),
  // so force fetches again after it.
  const request = (pending ? pending.catch(() => {}) : Promise.resolve())
    .then(() => getCollectionQuery(collection, user))
    .then((query) => getDocs(query))
    .then((snapshot) => {
      const data = getSnapshotData(snapshot)
      // the user or customer changed while fetching,
      // return the data without caching it.
      if (generation !== userGeneration) {
        return data
      }

      return updateCache({
        collection: collection,
        data: data,
      })
    })
    .finally(() => {
      if (collectionRequestQueue[key] === request) {
        delete collectionRequestQueue[key]
      }
    })

  // queue the request right away, so concurrent calls share it
  collectionRequestQueue[key] = request

  return request
}

function getSnapshotData (querySnapshot) {
  const data = {}
  querySnapshot.docs.forEach((doc) => {
    data[doc.id] = doc.data()
  })

  return data
}

async function updateCache ({collection, data}) {
  await browser.storage.local.set({
    [collection]: data
  })

  const eventName = `${collection}-updated`
  let eventData = data
  if (collection === 'templates') {
    eventData = parseTemplatesCollection(data)
  } else if (collection === 'tags') {
    eventData = parseTagsCollection(data)
  }

  trigger(eventName, eventData)

  await setExtensionData({
    lastSync: Date.now(),
  })

  return data
}

// waits for a customer switch in progress, to get the user after it
async function getSignedInUserAfterSwitch () {
  const user = await getSignedInUser()
  if (!customerSwitch) {
    return user
  }

  await customerSwitch.request.catch(() => {})
  return getSignedInUser()
}

// keeps the cached data when offline
export async function refetchCollections (collections = []) {
  const known = collections.filter((c) => allCollections.includes(c))
  let collectionsToFetch = known.length ? known : allCollections

  let user
  try {
    user = await getSignedInUserAfterSwitch()
  } catch (err) {
    if (isLoggedOut(err)) {
      return
    }

    throw err
  }

  const fetchCollection = (collection) => getCollection({
    collection: collection,
    user: user,
    force: true,
  })

  // failed collections don't stop fetching the others
  const errors = []

  // the active customer depends on the users data,
  // so we fetch the users first.
  if (collectionsToFetch.includes('users')) {
    collectionsToFetch = collectionsToFetch.filter((c) => c !== 'users')

    try {
      await fetchCollection('users')
      user = await getSignedInUserAfterSwitch()
    } catch (err) {
      if (isLoggedOut(err)) {
        return
      }

      errors.push(err)
    }
  }

  // the templates query depends on the customer plan,
  // so we fetch the customers first.
  if (collectionsToFetch.includes('customers')) {
    collectionsToFetch = collectionsToFetch.filter((c) => c !== 'customers')

    try {
      const cache = await browser.storage.local.get('customers')
      const customers = await fetchCollection('customers')
      if (
        isFreeCustomer(cache.customers, user.customer) !== isFreeCustomer(customers, user.customer)
        && !collectionsToFetch.includes('templates')
      ) {
        collectionsToFetch = collectionsToFetch.concat('templates')
      }
    } catch (err) {
      errors.push(err)
    }
  }

  const results = await Promise.allSettled(collectionsToFetch.map(fetchCollection))
  results.forEach((result) => {
    if (result.status === 'rejected') {
      errors.push(result.reason)
    }
  })

  if (errors.length) {
    throw errors[0]
  }
}

function isFreeCustomer (customers = {}, customerId = '') {
  return customers?.[customerId]?.subscription?.plan === 'free'
}

// three hours
const defaultSyncTimeout = 3 * 60 * 60 * 1000
export async function autosync (timeout = defaultSyncTimeout) {
  const data = await getExtensionData()
  const lastSync = new Date(data.lastSync)
  // auto sync if last sync was more than timeout ago
  if (new Date() - lastSync > timeout) {
    return refetchCollections()
  }

  return
}

// fetch wrapper
async function request (url, params = {}) {
  const defaults = {
    authorization: false,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {},
  }

  const data = {
    ...defaults,
    ...params,
  }
  data.method = data.method.toUpperCase()

  // auth support
  if (data.authorization) {
    const token = await firebaseAuth.currentUser.getIdToken(true)
    data.headers.Authorization = `Bearer ${token}`
  }

  if (data.method !== 'GET') {
    data.body = JSON.stringify(data.body)
  } else {
    delete data.body
  }

  const response = await fetch(url, {
    method: data.method,
    headers: data.headers,
    body: data.body,
  })

  // handle errors
  if (!response.ok) {
    const responseJson = await response.clone().json()
    return Promise.reject(responseJson)
  }

  return response.json()
}

export async function getSettings () {
  let user
  try {
    user = await getSignedInUser()
  } catch (err) {
    if (isLoggedOut(err)) {
      return defaultSettings
    }
    throw err
  }

  const users = await getCollection({
    user: user,
    collection: 'users',
  })

  const userData = users[user.id]
  return {
    ...defaultSettings,
    ...userData?.settings,
  }
}

const LOGGED_OUT_ERR = 'logged-out'
function isLoggedOut (err) {
  return err === LOGGED_OUT_ERR
}

function getFirebaseUser () {
  // return faster if possible
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe()
      resolve(user)
    }, (err) => {
      reject(err)
    })
  })
}

const globalUserKey = 'firebaseUser'
export async function getSignedInUser () {
  const generation = userGeneration
  const storedUser = await browser.storage.local.get(globalUserKey)
  const user = storedUser[globalUserKey] || {}

  const firebaseUser = await getFirebaseUser()
  if (firebaseUser) {
    // logged in to firebase and storage
    if (user.id === firebaseUser.uid) {
      const customer = await getActiveCustomer({
        ...user,
        generation: generation,
      })
      // no longer part of the stored customer, and part of another one.
      // on first run after login, user.customer is null,
      // and will be populated once signinWithToken is done.
      if (customer && user.customer && user.customer !== customer) {
        // switch in the background,
        // and keep using the stored customer until the switch is saved.
        switchActiveCustomer(customer, user.customer)
          .catch((err) => debug(['switchActiveCustomer', err], 'warn'))

        return {
          id: user.id,
          customer: user.customer,
          generation: generation,
        }
      }

      return {
        id: user.id,
        customer: customer,
        generation: generation,
      }
    }
  } else {
    // automatic firebase logout
    if (Object.keys(user).length) {
      badgeUpdate(false)
      clearDataCache()
      await setSignedInUser({})
      trigger('logout')
    }
  }

  throw LOGGED_OUT_ERR
}

// extra data is saved in the same write as the user
async function setSignedInUser (user, extraData = {}) {
  // before the write, for requests already in progress,
  // and after it, for requests that read the previous user during the write.
  userChanged()
  await browser.storage.local.set({
    ...extraData,
    [globalUserKey]: user,
  })
  userChanged()
  return user
}

async function isFree (user) {
  const customers = await getCollection({
    user: user,
    collection: 'customers'
  })
  const customer = customers[user.customer]
  return customer.subscription.plan === 'free'
}

export async function getTemplates () {
  let user
  try {
    user = await getSignedInUser()
  } catch (err) {
    if (isLoggedOut(err)) {
      return getDefaultTemplates()
    }

    throw err
  }

  const templates = await getCollection({
    user: user,
    collection: 'templates',
  })
  return parseTemplatesCollection(templates)
}

function parseTemplatesCollection (templatesCollection = {}) {
  return Object.entries(templatesCollection)
    .map(([id, template]) => {
      return {
        ...template,
        id: id,
        _body_plaintext: htmlToText(template.body),
      }
    })
}

// can't reach api because:
// - extension is only running "on specific sites" and the api url is not added
// - api is blocked by firewall
// - api is down
const networkError = 'There was an issue signing you in. Check that the extension is set to run on all sites, or that your firewall or antivirus isn\'t blocking the connection.'
const manyRequestsError = 'Too many unsuccessful login attempts. Please try again later.'

function signinError (err) {
  if (err && err.code === 'auth/too-many-requests') {
    // recaptcha verifier is not supported in browser extensions
    // only http/https
    throw manyRequestsError
  }

  // catch "TypeError: Failed to fetch" errors
  if (!err.message || err instanceof TypeError) {
    throw networkError
  }

  throw err.message
}

export async function signin ({ email, password }) {
  try {
    const loginResponse = await request(`${functionsUrl}/api/1/login`, {
      method: 'POST',
      body: {
        email: email,
        password: password,
      }
    })
    return signinWithToken(loginResponse.token)
  } catch (err) {
    return signinError(err)
  }
}

export async function getSession () {
  try {
    // create session
    await getSignedInUser()
    return request(`${functionsUrl}/api/1/session`, {
      authorization: true,
    })
  } catch {
    // try to auto login
    const session = await request(`${functionsUrl}/api/1/session`)
    return signinWithToken(session.token)
  }
}

export async function logout () {
  await signOut(firebaseAuth)
  await setSignedInUser({})

  badgeUpdate(false)
  clearDataCache()
  trigger('logout')

  return request(`${functionsUrl}/api/1/logout`, {
    method: 'POST',
  })
}

async function signinWithToken (token = '') {
  const auth = await signInWithCustomToken(firebaseAuth, token)
  // clear existing cached data,
  // in case we still have collections cached from another user
  await clearDataCache()
  // immediately set stored user, in case we call getSignedInUser,
  // before signinWithToken is done.
  const user = await setSignedInUser({
    id: auth.user.uid,
    customer: null,
  })

  badgeUpdate(true)

  // triggers users-updated because of getCollection,
  // which in turn triggers getSignedInUser.
  const customer = await getActiveCustomer(user)

  await setSignedInUser({
    id: user.id,
    customer: customer,
  })

  trigger('login')
}

export async function getCustomer (customerId) {
  const user = await getSignedInUser()
  const customers = await getCollection({
    user: user,
    collection: 'customers'
  })
  return customers[customerId]
}

export async function isFreePlan () {
  return isFree(await getSignedInUser())
}

async function getActiveCustomer (user = {}) {
  const users = await getCollection({
      user: {
        id: user.id,
        generation: user.generation,
      },
      collection: 'users'
    })

  const userData = users[user.id]
  const customers = userData.customers

  // make sure we are still part of this customer
  if (user.customer && customers.includes(user.customer)) {
    return user.customer
  }

  // active customer,
  // default to first customer
  return userData.customers[0]
}

// switches run one at a time,
// and concurrent calls for the same customer share the same switch.
let customerSwitch = null
function switchActiveCustomer (customerId, fromCustomerId) {
  if (customerSwitch?.customerId === customerId) {
    return customerSwitch.request
  }

  const previous = customerSwitch ? customerSwitch.request.catch(() => {}) : Promise.resolve()
  const request = previous
    .then(() => switchCustomer(customerId, fromCustomerId))
    .finally(() => {
      if (customerSwitch?.request === request) {
        customerSwitch = null
      }
    })

  customerSwitch = {
    customerId: customerId,
    request: request,
  }

  return request
}

const SWITCH_CANCELLED_ERR = 'switch-cancelled'

// fetches the customer's data first, then saves it together with the customer.
// if fetching fails (e.g., offline), or the switch is cancelled, nothing changes.
async function switchCustomer (customerId, fromCustomerId) {
  const generation = userGeneration
  const storedUser = await browser.storage.local.get(globalUserKey)
  const activeUser = storedUser[globalUserKey] || {}
  // an automatic switch doesn't replace a customer picked in the meantime
  if (fromCustomerId && activeUser.customer !== fromCustomerId) {
    throw SWITCH_CANCELLED_ERR
  }

  // firebase restores the user after the service worker starts
  const firebaseUser = await getFirebaseUser()
  if (!firebaseUser) {
    throw LOGGED_OUT_ERR
  }

  const user = {
    id: firebaseUser.uid,
    customer: customerId,
  }

  // the templates query depends on the customer plan
  const cache = await browser.storage.local.get('customers')
  if (!cache.customers?.[customerId]) {
    const customers = await getCollection({
      collection: 'customers',
      user: user,
      force: true,
    })
    if (!customers[customerId]) {
      throw new Error(`Customer ${customerId} not found`)
    }
  }

  const [templates, tags] = await Promise.all(
    customerCollections.map(async (collection) => {
      const query = await getCollectionQuery(collection, user)
      return getSnapshotData(await getDocs(query))
    })
  )

  // the user changed while fetching (e.g., logged out)
  if (generation !== userGeneration) {
    throw SWITCH_CANCELLED_ERR
  }

  await setSignedInUser(user, {
    templates: templates,
    tags: tags,
  })

  trigger('templates-updated', parseTemplatesCollection(templates))
  trigger('tags-updated', parseTagsCollection(tags))
}

export async function setActiveCustomer (customerId) {
  return switchActiveCustomer(customerId)
}

export async function updateTemplateStats ({id = '', _body_plaintext = ''}) {
  const data = await getExtensionData()
  // last used cache
  let lastuseCache = data.templatesLastUsed || {}
  lastuseCache[id] = new Date().toISOString()
  // time saved (words)
  const wordCount = (_body_plaintext || '').split(' ').length
  const words = data.words + wordCount

  return setExtensionData({
    templatesLastUsed: lastuseCache,
    words: words,
  })
}

export async function getAccount () {
  const cachedUser = await getSignedInUser()
  const users = await getCollection({
    user: cachedUser,
    collection: 'users'
  })
  const userData = users[cachedUser.id]
  return {
    id: cachedUser.id,
    customer: cachedUser.customer,

    customers: userData.customers,
    email: userData.email,
    full_name: userData.full_name,
  }
}

export async function getTags () {
  let user
  try {
    user = await getSignedInUser()
  } catch (err) {
    if (isLoggedOut(err)) {
      // logged-out
      return defaultTags
    }

    throw err
  }

  const tags = await getCollection({
    collection: 'tags',
    user: user,
  })

  return parseTagsCollection(tags)
}

function parseTagsCollection (tags = {}) {
  return Object.entries(tags)
    .map(([id, tag]) => {
      return {
        id: id,
        ...tag,
      }
    })
}

function tagIdsToTitles (tagIds = [], allTags = []) {
  return tagIds
    .map((tagId) => {
      return allTags.find((t) => t.id === tagId)
    })
    .filter(Boolean)
}

function getSearchList (templates = [], allTags = []) {
  return templates.map((template) => {
    return {
      ...template,
      body: template._body_plaintext,
      tags: tagIdsToTitles(template.tags, allTags).map((t) => t?.title),
    }
  })
}

let lastSearchQuery = ''
export async function searchTemplates (query = '') {
  lastSearchQuery = query

  const [templates, tags] = await Promise.all([
    getTemplates(),
    getTags(),
  ])

  // avoid triggering fuzzySearch
  // if this is not the latest search query, for better performance.
  if (query !== lastSearchQuery) {
    return {
      query: '_SEARCH_CANCELED',
      results: [],
    }
  }

  const templateSearchList = getSearchList(templates, tags)
  return {
    query: query,
    results: fuzzySearch(templates, templateSearchList, query),
  }
}

export async function isCached () {
  // when templates are cached
  const key = 'templates'
  const cache = await browser.storage.local.get(key)
  if (cache[key]) {
    return true
  }

  return false
}
