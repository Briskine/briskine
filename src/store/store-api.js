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

import config from '../config.js'
import trigger from './store-trigger.js'
import fuzzySearch from './search.js'
import {badgeUpdate} from '../background/badge.js'
import {getDefaultTemplates, defaultTags, defaultSettings} from './default-data.js'
import htmlToText from '../content/utils/html-to-text.js'
import {getExtensionData, setExtensionData} from './extension-data.js'

export {getExtensionData, setExtensionData} from './extension-data.js'
export {openPopup} from './open-popup.js'

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

// convert firestore timestamps to dates
const timestamps = [
  'created_datetime',
  'modified_datetime',
  'deleted_datetime',
]

function convertToNativeDates (obj = {}) {
  const parsed = Object.assign({}, obj)
  timestamps.forEach((prop) => {
    if (obj[prop] && typeof obj[prop].seconds === 'number' && typeof obj[prop].nanoseconds === 'number') {
      const d = new Timestamp(obj[prop].seconds, obj[prop].nanoseconds)
      parsed[prop] = d.toDate()
    }
  })
  return parsed
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

const allCollections = [
  'users',
  'customers',
  'tags',
  'templatesOwned',
  'templatesShared',
  'templatesEveryone',
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

function getCollection (params = {}) {
  // request is already in progress
  if (collectionRequestQueue[params.collection]) {
    return collectionRequestQueue[params.collection]
  }

  // get from cache
  return browser.storage.local.get(params.collection)
    .then((res) => {
      if (res[params.collection]) {
        return res[params.collection]
      }

      const query = getCollectionQuery(params.collection, params.user)
      collectionRequestQueue[params.collection] = getDocs(query).then((snapshot) => {
        collectionRequestQueue[params.collection] = null
        return refreshLocalData(params.collection, snapshot)
      })

      return collectionRequestQueue[params.collection]
    })
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

async function updateCache (params = {}) {
  await browser.storage.local.set({
    [params.collection]: params.data
  })

  const eventName = params.collection.includes('templates') ? 'templates-updated' : `${params.collection}-updated`
  trigger(eventName, params.data)

  await setExtensionData({
    lastSync: Date.now(),
  })

  return params.data
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

// two hours
const defaultSyncTimeout = 2 * 60 * 60 * 1000
export async function autosync (timeout = defaultSyncTimeout) {
  const data = await getExtensionData()
  const lastSync = new Date(data.lastSync)
  // auto sync if last sync was more than timeout ago
  if (new Date() - lastSync > timeout) {
    return refetchCollections()
  }

  return
}

// handle fetch errors
function handleErrors (response) {
  if (!response.ok) {
    return response.clone().json().then((res) => {
      return Promise.reject(res)
    })
  }
  return response
}

// fetch wrapper
// support authorization header, form submit, query params, error handling
function request (url, params = {}) {
  const defaults = {
    authorization: false,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {},
  }

  const data = Object.assign({}, defaults, params)
  data.method = data.method.toUpperCase()

  // auth support
  let auth = Promise.resolve()
  if (data.authorization) {
    auth = getUserToken()
  }

  return auth
    .then((res) => {
      if (res) {
        data.headers.Authorization = `Bearer ${res.token}`
      }

      if (data.method !== 'GET') {
        data.body = JSON.stringify(data.body)
      } else {
        delete data.body
      }

      return fetch(url, {
          method: data.method,
          headers: data.headers,
          body: data.body,
        })
        .then(handleErrors)
        .then((res) => res.json())
    })
}

// return user and token
function getUserToken () {
  return firebaseAuth.currentUser.getIdToken(true)
    .then((token) => {
      return getSignedInUser().then((user) => {
        return {
          user: user,
          token: token
        }
      })
    })
}

export function getSettings () {
  return getSignedInUser()
    .then((user) => {
      return Promise.all([
        user.id,
        getCollection({
          user: user,
          collection: 'users'
        })
      ])
    })
    .then(([id, users]) => {
      const userData = users[id]
      if (userData) {
        return Object.assign({}, defaultSettings, userData.settings)
      }

      return defaultSettings
    })
    .catch((err) => {
      if (isLoggedOut(err)) {
        // logged-out
        return defaultSettings
      }

      throw err
    })
}

var LOGGED_OUT_ERR = 'logged-out'
function isLoggedOut (err) {
  return err === LOGGED_OUT_ERR
}

async function getFirebaseUser () {
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
      trigger('logout', {}, 0)
    }
  }

  throw LOGGED_OUT_ERR
}

function setSignedInUser (user) {
  return new Promise((resolve) => {
    let globalUser = {}
    globalUser[globalUserKey] = user
    browser.storage.local.set(globalUser).then(() => {
      resolve(user)
    })
  })
}

function isFree (user) {
  return getCollection({
      user: user,
      collection: 'customers'
    })
    .then((customers) => {
      const customer = customers[user.customer]
      return customer.subscription.plan === 'free'
    })
}

const templatesFreeLimit = 30

export function getTemplates () {
  return getSignedInUser()
    .then((user) => {
      return Promise.all([
        user,
        isFree(user)
      ])
    })
    .then((res) => {
      const [user, freeCustomer] = res
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

      return Promise.all(templateCollections)
        .then((res) => {
          // merge and de-duplication
          return Object.assign({}, ...res)
        })
        .then((templates) => {
          return Object.keys(templates).map((id) => {
            const template = templates[id]
            return Object.assign(convertToNativeDates(template), {
              id: id,
              _body_plaintext: htmlToText(template.body),
            })
          })
        })
        .then((templates) => {
          if (freeCustomer) {
            return templates
              .sort((a, b) => {
                return new Date(a.created_datetime || 0) - new Date(b.created_datetime || 0)
              })
              .slice(0, templatesFreeLimit)
          }
          return templates
        })
    })
    .catch((err) => {
      if (isLoggedOut(err)) {
        return getDefaultTemplates()
      }

      throw err
    })
}

const networkError = 'There was an issue signing you in. Please disable your firewall or antivirus software and try again.'

function signinError (err) {
  if (err && err.code === 'auth/too-many-requests') {
    // recaptcha verifier is not supported in browser extensions
    // only http/https
    throw 'Too many unsuccessful login attempts. Please try again later. '
  }

  // catch "TypeError: Failed to fetch" errors
  if (!err.message || err instanceof TypeError) {
    throw networkError
  }

  throw err.message
}

export function signin (params = {}) {
  return request(`${config.functionsUrl}/api/1/login`, {
      method: 'POST',
      body: {
        email: params.email,
        password: params.password,
        apiKey: FIREBASE_CONFIG.apiKey,
      }
    })
    .then((res) => {
      return signinWithToken(res.token)
    })
    .then(() => {
      return trigger('login', {}, 0)
    })
    .catch((err) => {
      return signinError(err)
    })
}

export function getSession () {
  return getSignedInUser()
    .then(() => {
      // create session
      return true
    })
    .catch(() => {
      // try to auto login
      return false
    })
    .then((loggedIn) => {
      // create session
      return Promise.all([
        loggedIn,
        request(`${config.functionsUrl}/api/1/session`, {
          authorization: loggedIn,
        })
      ])
    })
    .then(([loggedIn, res]) => {
      if (!loggedIn) {
        // auto-login if not logged-in
        return signinWithToken(res.token)
          .then(() => {
            return trigger('login', {}, 0)
          })
      }

      return res
    })
}

export async function logout () {
  await signOut(firebaseAuth)
  await setSignedInUser({})

  badgeUpdate(false)
  clearDataCache()
  trigger('logout', {}, 0)

  return request(`${config.functionsUrl}/api/1/logout`, {
      method: 'POST'
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

  return setSignedInUser({
    id: user.id,
    customer: customer,
  })
}

export function getCustomer (customerId) {
  return getSignedInUser()
    .then((user) => {
      return getCollection({
        user: user,
        collection: 'customers'
      })
    })
    .then((customers) => {
      return customers[customerId]
    })
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

export function updateTemplateStats ({id = '', _body_plaintext = ''}) {
  return getExtensionData()
    .then((data) => {
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
    })
}

export function getAccount () {
  return getSignedInUser()
    .then((user) => {
      return Promise.all([
        user,
        getCollection({
          user: user,
          collection: 'users'
        })
      ])
    })
    .then(([cachedUser, users]) => {
      const userData = users[cachedUser.id]
      return {
        id: cachedUser.id,
        customer: cachedUser.customer,

        customers: userData.customers,
        email: userData.email,
        full_name: userData.full_name,
      }
    })
}

export function getTags () {
  return getSignedInUser()
    .then((user) => {
      return getCollection({
        collection: 'tags',
        user: user
      })
    })
    .then((tags) => {
      return Object.keys(tags).map((id) => {
        return Object.assign({id: id}, tags[id])
      })
    })
    .catch((err) => {
      if (isLoggedOut(err)) {
        // logged-out
        return defaultTags
      }

      throw err
    })
}

function parseTags (tagIds = [], allTags = []) {
  return tagIds
    .map((tagId) => {
      return allTags.find((t) => t.id === tagId)
    })
    .filter(Boolean)
}

function getSearchList (templates = [], allTags = []) {
  return templates.map((template) => {
    return Object.assign({}, template, {
      body: template._body_plaintext,
      tags: parseTags(template.tags, allTags).map((t) => t?.title),
    })
  })
}

let lastSearchQuery = ''
export function searchTemplates (query = '') {
  lastSearchQuery = query

  return Promise.all([
      getTemplates(),
      getTags(),
    ])
    .then(([templates, tags]) => {
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
    })
}

export async function isCached () {
  const key = 'templatesOwned'
  const cache = await browser.storage.local.get(key)
  if (cache[key]) {
    return true
  }

  return false
}
