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
  Timestamp,
} from 'firebase/firestore/lite'

import { functionsUrl }  from '../config.js'
import trigger from '../background/background-trigger.js'
import fuzzySearch from './search.js'
import {badgeUpdate} from '../background/badge.js'
import {getDefaultTemplates, defaultTags, defaultSettings} from './default-data.js'
import htmlToText from '../content/utils/html-to-text.js'
import {getExtensionData, setExtensionData} from './extension-data.js'

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
  // cache stats,
  // to keep them between login sessions
  const extensionData = await getExtensionData()
  const words = extensionData.words

  await browser.storage.local.clear()

  // restore time-saved stats
  return setExtensionData({
    words: words,
  })
}

const templatesCollection = collection(db, 'templates')

function templatesOwnedQuery (user) {
  return query(
    templatesCollection,
    where('customer', '==', user.customer),
    where('deleted_datetime', '==', null),
    where('owner', '==', user.id),
  )
}

function templatesSharedQuery (user) {
  return query(
    templatesCollection,
    where('customer', '==', user.customer),
    where('deleted_datetime', '==', null),
    where('sharing', '==', 'custom'),
    where('shared_with', 'array-contains', user.id),
    where('owner', '!=', user.id),
  )
}

function templatesEveryoneQuery (user) {
  return query(
    templatesCollection,
    where('customer', '==', user.customer),
    where('deleted_datetime', '==', null),
    where('sharing', '==', 'everyone'),
    where('owner', '!=', user.id),
  )
}

const templateCollections = [
  'templatesOwned',
  'templatesShared',
  'templatesEveryone',
]

const allCollections = [
  'users',
  'customers',
  'tags',
  ...templateCollections,
]

function getCollectionQuery (name, user) {
  const collectionQuery = {
    users: [documentId(), '==', user.id],
    customers: ['members', 'array-contains', user.id],
    tags: ['customer', '==', user.customer]
  }

  if (name === 'templatesOwned') {
    return templatesOwnedQuery(user)
  }

  if (name === 'templatesShared') {
    return templatesSharedQuery(user)
  }

  if (name === 'templatesEveryone') {
    return templatesEveryoneQuery(user)
  }

  return query(
    collection(db, name),
    where(...collectionQuery[name]),
  )
}

const collectionRequestQueue = {}

async function getCollection ({ collection, user }) {
  // request is already in progress
  if (collectionRequestQueue[collection]) {
    return collectionRequestQueue[collection]
  }

  // get from cache
  const cache = await browser.storage.local.get(collection)
  if (cache[collection]) {
    return cache[collection]
  }

  const query = getCollectionQuery(collection, user)
  collectionRequestQueue[collection] = getDocs(query).then((snapshot) => {
    collectionRequestQueue[collection] = null
    return refreshLocalData(collection, snapshot)
  })

  return collectionRequestQueue[collection]
}

// refresh local data cache from snapshot listeners
function refreshLocalData (collectionName, querySnapshot) {
  const data = {}
  querySnapshot.docs.forEach((doc) => {
    data[doc.id] = doc.data()
  })

  return updateCache({
    collection: collectionName,
    data: data
  })
}

let debouncedTemplatesUpdateEvent

async function updateCache ({collection, data}) {
  await browser.storage.local.set({
    [collection]: data
  })

  const eventCollection = templateCollections.includes(collection) ? 'templates' : collection
  const eventName = `${eventCollection}-updated`
  let eventData = data

  if (eventCollection === 'templates') {
    const cachedTemplateCollections = await browser.storage.local.get(templateCollections)

    let cachedTemplates = {}
    templateCollections.forEach((templateCollectionName) => {
      cachedTemplates = {
        ...cachedTemplates,
        ...cachedTemplateCollections[templateCollectionName],
      }
    })

    eventData = await parseTemplatesCollection(cachedTemplates)

    // debounce templates trigger
    // because we trigger it three times in a row (once for each templates collection)
    // for premium customers.
    clearTimeout(debouncedTemplatesUpdateEvent)
    debouncedTemplatesUpdateEvent = setTimeout(() => {
      trigger(eventName, eventData)
    }, 500)
  } else if (eventCollection === 'tags') {
    eventData = parseTagsCollection(data)
    trigger(eventName, eventData)
  } else {
    trigger(eventName, eventData)
  }

  await setExtensionData({
    lastSync: Date.now(),
  })

  return data
}

export async function refetchCollections (collections = []) {
  const collectionsToClear = collections.length ? collections : allCollections
  const cache = {}
  collectionsToClear.forEach((c) => {
    cache[c] = null
  })

  await browser.storage.local.set(cache)

  try {
    const user = await getSignedInUser()
    const free = await isFree(user)
    let collectionsToRefetch = collectionsToClear
    // don't refetch shared templates for free users
    if (free) {
      collectionsToRefetch = collectionsToClear.filter((c) => !['templatesShared', 'templatesEveryone'].includes(c))
    }

    return Promise.all(
      collectionsToRefetch.map((c) => getCollection({
        collection: c,
        user: user,
      }))
    )
  } catch (err) {
    if (isLoggedOut(err)) {
      return
    }

    throw err
  }
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

var LOGGED_OUT_ERR = 'logged-out'
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

var globalUserKey = 'firebaseUser'
export async function getSignedInUser () {
  const storedUser = await browser.storage.local.get(globalUserKey)
  const user = storedUser[globalUserKey] || {}

  const firebaseUser = await getFirebaseUser()
  if (firebaseUser) {
    // logged in to firebase and storage
    if (user.id === firebaseUser.uid) {
      const customer = await getActiveCustomer(user)
      // if we're no longer part of cached customer,
      // store default customer and refresh data.
      // on first run after login, user.customer is null,
      // and will be populated once signinWithToken is done.
      if (user.customer && user.customer !== customer) {
        setActiveCustomer(customer)
      }

      return {
        id: user.id,
        customer: customer,
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

async function setSignedInUser (user) {
  let globalUser = {}
  globalUser[globalUserKey] = user
  await browser.storage.local.set(globalUser)
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

  const freeCustomer = await isFree(user)
  let templateCollections = [
    getCollection({
      user: user,
      collection: 'templatesOwned'
    })
  ]

  if (!freeCustomer) {
    templateCollections = templateCollections.concat([
      getCollection({
        user: user,
        collection: 'templatesShared'
      }),
      getCollection({
        user: user,
        collection: 'templatesEveryone'
      })
    ])
  }

  let results = await Promise.all(templateCollections)
  let templates = Object.assign({}, ...results)
  return parseTemplatesCollection(templates)
}

// convert firestore timestamps to dates
const timestamps = [
  'created_datetime',
  'modified_datetime',
  'deleted_datetime',
]

function templateNativeDates (template = {}) {
  const templateDates = {}

  timestamps.forEach((prop) => {
    if (
      template[prop]
      && typeof template[prop].seconds === 'number'
      && typeof template[prop].nanoseconds === 'number'
    ) {
      const d = new Timestamp(template[prop].seconds, template[prop].nanoseconds)
      templateDates[prop] = d.toDate()
    }
  })

  return templateDates
}

const templatesFreeLimit = 30

async function parseTemplatesCollection (templatesCollection = {}) {
  const user = await getSignedInUser()
  const freeCustomer = await isFree(user)

  const templates = Object.keys(templatesCollection).map((id) => {
    const template = templatesCollection[id]
    return {
      ...template,
      ...templateNativeDates(template),
      id: id,
      _body_plaintext: htmlToText(template.body),
    }
  })

  if (freeCustomer) {
    return templates
      .sort((a, b) => {
        return new Date(a.created_datetime || 0) - new Date(b.created_datetime || 0)
      })
      .slice(0, templatesFreeLimit)
  }

  return templates
}

const networkError = 'There was an issue signing you in. Please disable your firewall or antivirus software and try again.'
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

async function getActiveCustomer (user = {}) {
  const users = await getCollection({
      user: {id: user.id},
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

export async function setActiveCustomer (customerId) {
  return setSignedInUser({
      id: firebaseAuth.currentUser.uid,
      customer: customerId,
    })
    .then(() => {
      // update data when customer changes
      refetchCollections([
        'templatesOwned',
        'templatesShared',
        'templatesEveryone',
        'tags',
      ])
      return
    })
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
  return Object.keys(tags).map((id) => {
    return {
      id: id,
      ...tags[id],
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
  // when private templates are cached
  const key = 'templatesOwned'
  const cache = await browser.storage.local.get(key)
  if (cache[key]) {
    return true
  }

  return false
}
