/* globals ENV, FIREBASE_CONFIG */
import browser from 'webextension-polyfill'

import {initializeApp} from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onIdTokenChanged,
  signOut
} from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  documentId,
} from 'firebase/firestore'

import config from '../config.js'
import trigger from './store-trigger.js'

const firebaseApp = initializeApp(FIREBASE_CONFIG)
const firebaseAuth = getAuth(firebaseApp)
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true
})

// development emulators
if (ENV === 'development') {
  connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 5002);
}

// convert firestore timestamps to dates
function convertToNativeDates (obj = {}) {
  var parsed = Object.assign({}, obj);
  Object.keys(parsed).forEach((prop) => {
      if (parsed[prop] && typeof parsed[prop].toDate === 'function') {
          parsed[prop] = parsed[prop].toDate();
      }
  });

  return parsed;
}

const collections = [
  'customers',
  'users',
  'tags',
  'templatesOwned',
  'templatesShared',
  'templatesEveryone',
]

function clearDataCache () {
  collections.forEach((collection) => {
    browser.storage.local.set({
      [collection]: null
    })
  })

  // clear templates last used cache
  setExtensionData({
    templatesLastUsed: {}
  })

  stopSnapshots()
}

const templatesCollection = collection(db, 'templates')

function templatesOwnedQuery (user) {
    return query(
      templatesCollection,
      where('customer', '==', user.customer),
      where('owner', '==', user.id),
      where('deleted_datetime', '==', null)
    );
}

function templatesSharedQuery (user) {
    return query(
      templatesCollection,
      where('customer', '==', user.customer),
      where('shared_with', 'array-contains', user.id),
      where('deleted_datetime', '==', null)
    );
}

function templatesEveryoneQuery (user) {
    return query(
      templatesCollection,
      where('customer', '==', user.customer),
      where('sharing', '==', 'everyone'),
      where('deleted_datetime', '==', null)
    );
}

function getCollectionQuery (name, user) {
  const collectionQuery = {
    users: [documentId(), '==', user.id],
    customers: ['members', 'array-contains', user.id],
    tags: ['customer', '==', user.customer]
  }

  if (name === 'templatesOwned') {
    return templatesOwnedQuery(user);
  }

  if (name === 'templatesShared') {
    return templatesSharedQuery(user);
  }

  if (name === 'templatesEveryone') {
    return templatesEveryoneQuery(user);
  }

  return query(
    collection(db, name),
    where(...collectionQuery[name])
  );
}

const collectionRequestQueue = {}

function getCollection (params = {}) {
  // request is already in progress
  if (collectionRequestQueue[params.collection]) {
    return collectionRequestQueue[params.collection]
  }

  // if the snapshot was not set yet
  if (!snapshotListeners[params.collection]) {
    // snapshots will trigger when first set,
    // and return the initial data.
    collectionRequestQueue[params.collection] = startSnapshot(params.collection, params.user)
      .then((res) => {
        collectionRequestQueue[params.collection] = null
        return res
      })
  }

  // get from cache
  return browser.storage.local.get(params.collection)
    .then((res) => {
      if (res[params.collection]) {
        return res[params.collection]
      }

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

function updateCache (params = {}) {
  browser.storage.local.set({
    [params.collection]: params.data
  })

  const eventName = params.collection.includes('templates') ? 'templates-updated' : `${params.collection}-updated`
  trigger(eventName, params.data)

  return params.data
}

const snapshotListeners = {}
function startSnapshot (collectionName, user) {
  return new Promise((resolve) => {
    const snapshotQuery = getCollectionQuery(collectionName, user)
    snapshotListeners[collectionName] = onSnapshot(snapshotQuery, (snapshot) => {
      // returns first response,
      // and keeps updating cache.
      resolve(refreshLocalData(collectionName, snapshot))
    })
  })
}

function stopSnapshots () {
  Object.keys(snapshotListeners).forEach((snapshotKey) => {
    const unsubscriber = snapshotListeners[snapshotKey]
    if (unsubscriber) {
      unsubscriber()
    }

    snapshotListeners[snapshotKey] = null
  })
}

// handle fetch errors
function handleErrors (response) {
    if (!response.ok) {
        return response.clone().json().then((res) => {
            return Promise.reject(res);
        });
    }
    return response;
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

      return fetch(url, {
          method: data.method,
          headers: data.headers,
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

const defaultSettings = {
  dialog_enabled: true,
  dialog_button: true,
  dialog_shortcut: 'ctrl+space',
  dialog_limit: 100,
  dialog_sort: false,

  expand_enabled: true,
  expand_shortcut: 'tab',

  blacklist: []
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

var globalUserKey = 'firebaseUser'
function getSignedInUser () {
  return new Promise((resolve, reject) => {
    browser.storage.local.get(globalUserKey).then((res) => {
      const user = res[globalUserKey] || {}
      if (Object.keys(user).length) {
        return resolve(user)
      }

      return reject(LOGGED_OUT_ERR)
    })
  })
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

// auth change
onIdTokenChanged(firebaseAuth, (firebaseUser) => {
  if (!firebaseUser) {
    clearDataCache()
    return setSignedInUser({})
  }

  return getSignedInUser()
    .then((user) => {
      if (user.id === firebaseUser.uid) {
        return
      }

      clearDataCache()
      return updateCurrentUser(firebaseUser)
    })
})

function getDefaultTemplates () {
    const defaultTemplates = [
        {
            title: 'Say Hello',
            shortcut: 'h',
            subject: '',
            tags: 'en, greetings',
            body: '<div>Hello {{to.first_name}},</div><div></div>'
        },
        {
            title: 'Nice talking to you',
            shortcut: 'nic',
            subject: '',
            tags: 'en, followup',
            body: '<div>It was nice talking to you.</div>'
        },
        {
            title: 'Kind Regards',
            shortcut: 'kr',
            subject: '',
            tags: 'en, closing',
            body: '<div>Kind regards,</div><div>{{from.first_name}}.</div>'
        },
        {
            title: 'My email',
            shortcut: 'e',
            subject: '',
            tags: 'en, personal',
            body: '<div>{{from.email}}</div>'
        }
    ];

    if (ENV === 'development') {
      let allVarsBody = [ 'account', 'from', 'to', 'cc', 'bcc' ].map((field) => {
        return `
          <div>
            <strong># ${field}</strong>
          </div>
          {{#each ${field}}}
            <div>
              {{@key}}: {{this}}
            </div>
          {{/each}}
        `
      }).join('')

      allVarsBody += `
        <div>subject: {{subject}}</div>
        <div>next week: {{moment add='7;days' format='DD MMMM'}}</div>
        <div>last week: {{moment subtract='7;days'}}</div>
        <div>choice: {{choice 'Hello, Hi, Hey'}}</div>
        <div>domain: {{domain to.email}}</div>
        <div><img src="https://www.briskine.com/images/briskine-promo.png" width="100" height="73"></div>
      `

      defaultTemplates.push({
        title: 'allvars',
        shortcut: 'allvars',
        subject: 'Subject',
        body: allVarsBody,
        to: 'to@briskine.com',
        cc: 'cc@briskine.com, cc2@briskine.com',
        bcc: 'bcc@briskine.com',
        from: 'contact@briskine.com'
      })

      defaultTemplates.push({
        title: 'broken',
        shortcut: 'broken',
        body: 'Hello {{to.first_name}'
      })
    }

    return defaultTemplates.map((template, index) => {
        const id = String(index)
        return Object.assign({
            id: id,
        }, template)
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

function idsToTags (ids, tags) {
  return ids.map((tagId) => {
    const tag = tags[tagId] && tags[tagId].title
    return tag || ''
  })
}

export function getTemplates () {
  return getSignedInUser()
    .then((user) => {
      return Promise.all([
        user,
        isFree(user)
      ])
    })
    .then((res) => {
      const [user, freeCustomer] = res;
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

      let tags = {}
      return getCollection({
          user: user,
          collection: 'tags'
        })
        .then((res) => {
          tags = res
          return Promise.all(templateCollections)
        })
        .then((res) => {
          // merge and de-duplication
          return Object.assign({}, ...res)
        })
        .then((templates) => {
          return Object.keys(templates).map((id) => {
            return Object.assign(convertToNativeDates(templates[id]), {
              id: id,
              tags: idsToTags(templates[id].tags, tags).join(', '),
            })
          })
        })
    })
    .catch((err) => {
      if (isLoggedOut(err)) {
        return getDefaultTemplates()
      }

      throw err;
    });
}

// backwards compatibility
function signinError (err) {
  if (err && err.code === 'auth/too-many-requests') {
    // recaptcha verifier is not supported in browser extensions
    // only http/https
    err.message = 'Too many unsuccessful login attempts. Please try again later. '
  }

  throw {
    error: err.message || 'There was an issue signing you in. Please try again later.'
  }
}

function updateCurrentUser (firebaseUser) {
  let cachedUser = {}

  // get cached user,
  // for customer switching
  return getSignedInUser()
    .then((user) => {
      cachedUser = user
      return cachedUser
    })
    // logged-out
    .catch(() => {
      return
    })
    .then(() => {
      return getCollection({
        user: {id: firebaseUser.uid},
        collection: 'users'
      })
    })
    .then((users) => {
      const userData = users[firebaseUser.uid]
      const customers = userData.customers

      // active customer,
      // default to first customer
      let customer = userData.customers[0]

      // customer switching support.
      // get specific user from parameter, or from cache.
      // only update customer if part cu current user's customers.
      let newCustomer = firebaseUser.customer || cachedUser.customer
      if (customers.includes(newCustomer)) {
        customer = newCustomer
      }

      return setSignedInUser({
        id: firebaseUser.uid,
        customer: customer,
      })
    })
}

export function signin (params = {}) {
  return signInWithEmailAndPassword(firebaseAuth, params.email, params.password)
    .then((authRes) => {
      return updateCurrentUser(authRes.user)
    })
    .then(() => {
      return createSession()
    })
    .then(() => {
      return trigger('login')
    })
    .catch((err) => {
      return signinError(err)
    })
}

export function createSession () {
    return request(`${config.functionsUrl}/api/1/session`, {
            method: 'POST',
            authorization: true
        });
}

// check existing session
export function getSession () {
  return request(`${config.functionsUrl}/api/1/session`)
    .then((res) => {
      return signinWithToken(res.token)
    })
    .then(() => {
      return trigger('login')
    })
}

export function logout () {
  return signOut(firebaseAuth)
    .then(() => {
      return request(`${config.functionsUrl}/api/1/logout`, {
          method: 'POST'
        })
    })
    .then(() => {
      return setSignedInUser({})
    })
    .then(() => {
      return trigger('logout')
    })
}

function signinWithToken (token = '') {
    return signInWithCustomToken(firebaseAuth, token)
        .then((res) => {
            return updateCurrentUser(res.user);
        })
}

export function getCustomer (customerId) {
  let customer = {};
  return getSignedInUser()
    .then((user) => {
      return Promise.all([
        getCollection({
          user: user,
          collection: 'customers'
        }),
        getCollection({
          user: user,
          collection: 'users'
        })
      ])
    })
    .then(([customers, users]) => {
      customer = customers[customerId]
      if (users[customer.owner]) {
        // we have the owner cached
        customer.ownerDetails = users[customer.owner]
      } else {
        return getDoc(doc(collection(db, 'users'), customer.owner))
          .then((ownerDoc) => {
            customer.ownerDetails = ownerDoc.data()
            return customer
          })
      }

      return customer
    })
}

export function setActiveCustomer (customerId) {
  clearDataCache()

  return updateCurrentUser({
      uid: firebaseAuth.currentUser.uid,
      customer: customerId
    })
}

const extensionDataKey = 'briskine'
const defaultExtensionData = {
  showPostInstall: true,
  words: 0,
  templatesLastUsed: {},
}

export function getExtensionData () {
  return browser.storage.local.get(extensionDataKey)
    .then((data) => {
      return Object.assign({}, defaultExtensionData, data[extensionDataKey])
    })
}

export function setExtensionData (params = {}) {
  return browser.storage.local.get(extensionDataKey)
    .then((data) => {
      // merge existing data with defaults and new data
      return Object.assign({}, defaultExtensionData, data[extensionDataKey], params)
    })
    .then((newData) => {
      const dataWrap = {}
      dataWrap[extensionDataKey] = newData
      return browser.storage.local.set(dataWrap)
    })
}

export function updateTemplateStats (id) {
  return getExtensionData()
    .then((data) => {
      let lastuseCache = data.templatesLastUsed || {}
      lastuseCache[id] = new Date().toISOString()

      return setExtensionData({
        templatesLastUsed: lastuseCache
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
