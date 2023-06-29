/* globals ENV, FIREBASE_CONFIG */
import browser from 'webextension-polyfill'

import {initializeApp} from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
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
  documentId,
} from 'firebase/firestore'

import config from '../config.js'
import trigger from './store-trigger.js'
import fuzzySearch from './search.js'

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

// naive html to text conversion
function plainText (html = '') {
  return html.replace(/(<[^>]*>)|(&nbsp;)/g, '').replace(/\s+/g, ' ').trim()
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

async function clearDataCache () {
  stopSnapshots()

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

const defaultSettings = {
  dialog_enabled: true,
  dialog_button: true,
  dialog_shortcut: 'ctrl+space',

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
    return getSignedInUser()
      .then((user) => {
        if (user) {
          clearDataCache()
          return setSignedInUser({})
        }

        // eslint-disable-next-line
        return
      })
      .catch((err) => {
        if (isLoggedOut(err)) {
          return
        }

        throw err
      })
  }

  return getSignedInUser()
    .then((user) => {
      if (user.id === firebaseUser.uid) {
        return
      }

      clearDataCache()
      return updateCurrentUser(firebaseUser)
    })
    .catch((err) => {
      // first login
      if (isLoggedOut(err)) {
        // logged-out
        return
      }

      throw err
    })
})

const defaultTags = [
  {title: 'en', color: 'blue'},
  {title: 'greetings', color: 'green'},
  {title: 'followup'},
  {title: 'closing'},
  {title: 'personal'},
].map((tag, index) => {
  return {
    ...tag,
    id: String(index),
  }
})

function filterDefaultTags (titles = []) {
  return defaultTags
    .filter((tag) => {
      if (titles.length) {
        return titles.includes(tag.title)
      }
      return true
    })
    .map((tag) => tag.id)
}

function getDefaultTemplates () {
  const defaultTemplates = [
    {
      title: 'Say Hello',
      shortcut: 'h',
      subject: '',
      tags: filterDefaultTags(['en', 'greetings']),
      body: '<div>Hello {{to.first_name}},</div><div></div>'
    },
    {
      title: 'Nice talking to you',
      shortcut: 'nic',
      subject: '',
      tags: filterDefaultTags(['en', 'followup']),
      body: '<div>It was nice talking to you.</div>'
    },
    {
      title: 'Kind Regards',
      shortcut: 'kr',
      subject: '',
      tags: filterDefaultTags(['en', 'closing']),
      body: '<div>Kind regards,</div><div>{{from.first_name}}.</div>'
    },
    {
      title: 'My email',
      shortcut: 'e',
      subject: '',
      tags: filterDefaultTags(['en', 'personal']),
      body: '<div>{{from.email}}</div>'
    }
  ]

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

    defaultTemplates.push({
      title: 'attachment',
      shortcut: 'attachment',
      body: 'attachment',
      attachments: [
        {
          name: 'briskine.svg',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.doc',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.pdf',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.zip',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.mp3',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.webm',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.txt',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.generic',
          url: 'https://www.briskine.com/favicon.svg',
        },
      ]
    })
  }

  return defaultTemplates
    .map((template, index) => {
      const id = String(index)
      return Object.assign({
        id: id,
        _body_plaintext: plainText(template.body),
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
              _body_plaintext: plainText(template.body),
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
      return trigger('login')
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
            return trigger('login')
          })
      }

      return res
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
      return updateCurrentUser(res.user)
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

export async function setActiveCustomer (customerId) {
  await clearDataCache()

  return updateCurrentUser({
      uid: firebaseAuth.currentUser.uid,
      customer: customerId
    })
}

const extensionDataKey = 'briskine'
const defaultExtensionData = {
  words: 0,
  templatesLastUsed: {},
  dialogSort: 'last_used',
  dialogTags: true,
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

      trigger('extension-data-updated', newData)

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
    // cherry-pick search properties
    return {
      title: template.title,
      shortcut: template.shortcut,
      body: template._body_plaintext,
      to: template.to,
      cc: template.cc,
      bcc: template.bcc,
      subject: template.subject,
      sharing: template.sharing,
      tags: parseTags(template.tags, allTags).map((t) => t?.title),
    }
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

export async function openPopup () {
  try {
    await browser.browserAction.openPopup()
  } catch (err) {
    // browserAction.openPopup is not supported in all browsers yet.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/openPopup
    // Open the action popup in a new tab.
    const popupUrl = browser.runtime.getURL('popup/popup.html')
    browser.tabs.create({
      url: `${popupUrl}?source=tab`
    })
  }
}
