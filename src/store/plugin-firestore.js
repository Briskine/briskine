/* globals ENV */
import browser from 'webextension-polyfill';

import {initializeApp} from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onIdTokenChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  getDoc,
  doc,
} from 'firebase/firestore';

import Config from '../config';
import firebaseConfig from './config-firebase';

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

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

function defaultDataCache () {
  return {
    customers: null,
    users: null,
    tags: null,

    templatesOwned: null,
    templatesShared: null,
    templatesEveryone: null
  }
}

let localDataCache = defaultDataCache()

function clearDataCache () {
  localDataCache = defaultDataCache()
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
    users: ['customers', 'array-contains-any', user.customers],
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
  const data = localDataCache[params.collection]
  if (!params.refresh && data) {
    return Promise.resolve(data)
  }

  // request is already in progress
  if (collectionRequestQueue[params.collection]) {
    return collectionRequestQueue[params.collection]
  }

  localDataCache[params.collection] = null;

  collectionRequestQueue[params.collection] = getDocs(
      getCollectionQuery(params.collection, params.user)
    )
    .then((res) => {
      const data = {}
      res.docs.forEach((doc) => {
        data[doc.id] = doc.data()
      })

      updateCache({
        collection: params.collection,
        data: data
      })

      collectionRequestQueue[params.collection] = null

      return data
    })

  return collectionRequestQueue[params.collection]

}

// refresh local data cache from snapshot listeners
function refreshLocalData (collectionName, querySnapshot) {
  localDataCache[collectionName] = null;

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
  localDataCache[params.collection] = params.data
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

  rich_editor: true,

  blacklist: []
}

var getSettings = () => {
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
    .then((res) => {
      const userData = res[1][res[0]]
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

var LOGGED_OUT_ERR = 'logged-out';
function isLoggedOut (err) {
    return err === LOGGED_OUT_ERR;
}

var globalUserKey = 'firebaseUser';
function getSignedInUser () {
    return new Promise((resolve, reject) => {
        browser.storage.local.get(globalUserKey).then((res) => {
            const user = res[globalUserKey] || {};
            if (Object.keys(user).length) {
                return resolve(user);
            }

            return reject(LOGGED_OUT_ERR);
        });
    });
}

function setSignedInUser (user) {
    return new Promise((resolve) => {
        var globalUser = {};
        globalUser[globalUserKey] = user;
        browser.storage.local.set(globalUser).then(() => {
            resolve();
        });
    });
}

var snapshotListeners = [];
function subscribeSnapshots (listeners = []) {
    snapshotListeners = snapshotListeners.concat(listeners);
}

function unsubscribeSnapshots () {
    snapshotListeners.forEach((unsubscriber) => {
        unsubscriber();
    });
}

// setup template change listeners on user or customer changes
function setupListeners (user) {
  unsubscribeSnapshots()

  // refresh templates on changes
  let templateSnapshots = [
    onSnapshot(templatesOwnedQuery(user), (snapshot) => {
      refreshLocalData('templatesOwned', snapshot)
    })
  ]

  if (!isFree(user)) {
    templateSnapshots = templateSnapshots.concat([
      onSnapshot(templatesSharedQuery(user), (snapshot) => {
        refreshLocalData('templatesShared', snapshot)
      }),
      onSnapshot(templatesEveryoneQuery(user), (snapshot) => {
        refreshLocalData('templatesEveryone', snapshot)
      }),
    ])
  }

  subscribeSnapshots(
    templateSnapshots.concat(
      ['tags', 'users', 'customers'].map((collectionName) => {
        return onSnapshot(getCollectionQuery(collectionName, user), (snapshot) => {
          refreshLocalData(collectionName, snapshot)
        })
      })
    )
  )
}

// auth change
onIdTokenChanged(firebaseAuth, (firebaseUser) => {
    if (!firebaseUser) {
        clearDataCache();
        unsubscribeSnapshots();

        return setSignedInUser({});
    }

    return updateCurrentUser(firebaseUser).then(() => {
        return getSignedInUser()
            .then((user) => {
                return setupListeners(user);
            })
            .catch((err) => {
                if (isLoggedOut(err)) {
                    // logged-out
                    return;
                }

                throw err;
            });
    });
});

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
        defaultTemplates.push({
            title: 'allvars',
            shortcut: 'allvars',
            subject: 'Subject',
            body: `
                <div>account.name: {{account.name}}</div>
                <div>account.first_name: {{account.first_name}}</div>
                <div>account.last_name: {{account.last_name}}</div>
                <div>account.email: {{account.email}}</div>
                <div>to.first_name: {{to.first_name}}</div>
                <div>to.last_name: {{to.last_name}}</div>
                <div>to.name: {{to.name}}</div>
                <div>to.email: {{to.email}}</div>
                <div>from.first_name: {{from.first_name}}</div>
                <div>from.last_name: {{from.last_name}}</div>
                <div>from.name: {{from.name}}</div>
                <div>from.email: {{from.email}}</div>
                <div>subject: {{subject}}</div>
                <div>next week: {{moment add='7;days' format='DD MMMM'}}</div>
                <div>last week: {{moment subtract='7;days'}}</div>
                <div>choice: {{choice 'Hello, Hi, Hey'}}</div>
                <div>domain: {{domain to.email}}</div>
            `,
            to: 'to@briskine.com',
            cc: 'cc@briskine.com',
            bcc: 'bcc@briskine.com',
            from: 'contact@briskine.com'
        });

        defaultTemplates.push({
            title: 'broken',
            shortcut: 'broken',
            body: 'Hello {{to.first_name}'
        });
    }

    const legacyTemplates = {};
    defaultTemplates.forEach((template, index) => {
        const id = String(index);
        legacyTemplates[id] = Object.assign({
            id: id,
            deleted: 0
        }, template);
    });

    return legacyTemplates;
}

function isFree (user) {
  return user.current_subscription.plan === 'free'
}

function idsToTags (ids, tags) {
  return ids.map((tagId) => {
    const tag = tags[tagId] && tags[tagId].title
    return tag || ''
  })
}

var getTemplate = () => {
  return getSignedInUser()
    .then((user) => {
      let templateCollections = [
        getCollection({
          user: user,
          collection: 'templatesOwned'
        })
      ]

      if (!isFree(user)) {
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

      let templates = {}
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

          res.forEach((list) => {
            Object.keys(list).forEach((id) => {
              templates[id] = convertToNativeDates(
                Object.assign(
                  {},
                  list[id],
                  {
                    id: id,
                    tags: idsToTags(list[id].tags, tags).join(', ')
                  }
                )
              )
            })
          })

          return templates
        })

    })
    .catch((err) => {
        if (isLoggedOut(err)) {
            return getDefaultTemplates();
        }

        throw err;
    });
};

// backwards compatibility
function signinError (err) {
    if (err && err.code === 'auth/too-many-requests') {
        // recaptcha verifier is not supported in browser extensions
        // only http/https
        err.message = 'Too many unsuccessful login attempts. Please try again later. ';
    }

    throw {
        error: err.message || 'There was an issue signing you in. Please try again later.'
    };
}

function updateCurrentUser (firebaseUser) {
    let user = {}
    let cachedUser = {}

    // get cached user,
    // for customer switching
    return getSignedInUser()
      .then((user) => {
        cachedUser = user;
        return cachedUser;
      })
      // logged-out
      .catch(() => {return;})
      .then(() => {
        return getDoc(doc(collection(db, 'users'), firebaseUser.uid))
      })
      .then((userDoc) => {
        const userData = userDoc.data()

          user = {
              id: firebaseUser.uid,
              email: userData.email,
              full_name: userData.full_name,

              // customers user is member of
              customers: userData.customers,
              // active customer
              // default to first customer
              customer: userData.customers[0],

              current_subscription: {
                  active: false,
                  created_datetime: '',
                  plan: '',
                  quantity: 1
              }
          };

          // customer switching support.
          // get specific user from parameter, or from cache.
          // only update customer if part cu current user's customers.
          let newCustomer = firebaseUser.customer || cachedUser.customer;
          if (user.customers.includes(newCustomer)) {
            user.customer = newCustomer;
          }

          return Promise.all([
            user.customer,
            getCollection({
              user: user,
              collection: 'customers'
            })
          ])
      })
      .then((res) => {
          const customerData = res[1][res[0]]
          // subscription data
          user.current_subscription = Object.assign(user.current_subscription, {
              plan: customerData.subscription.plan,
              quantity: customerData.subscription.quantity
          });

          // only premium or bonus plans are active
          if (customerData.subscription.plan !== 'free') {
              user.current_subscription.active = true;
          }

          return setSignedInUser(user);
      });
}

var signin = (params = {}) => {
    return signInWithEmailAndPassword(firebaseAuth, params.email, params.password)
        .then((authRes) => {
            return updateCurrentUser(authRes.user);
        })
        .then(() => {
            return createSession();
        })
        .then(() => {
            return window.store.trigger('login');
        })
        .catch((err) => {
            return signinError(err);
        });
};

var createSession = () => {
    return request(`${Config.functionsUrl}/api/1/session`, {
            method: 'POST',
            authorization: true
        });
};

// check existing session
var getSession = () => {
    return request(`${Config.functionsUrl}/api/1/session`)
        .then((res) => {
            return signinWithToken(res.token);
        });
};

var logout = () => {
    return signOut(firebaseAuth)
        .then(() => {
            return request(`${Config.functionsUrl}/api/1/logout`, {
                    method: 'POST'
                });
        })
        .then(() => {
            return setSignedInUser({});
        })
        .then(() => {
            return window.store.trigger('logout');
        });
};

function signinWithToken (token = '') {
    return signInWithCustomToken(firebaseAuth, token)
        .then((res) => {
            return updateCurrentUser(res.user);
        })
        .then(() => {
            return window.store.trigger('login');
        });
}

function getCustomer (customerId) {
  let customer = {};
  return getSignedInUser()
    .then((user) => {
      return Promise.all([
        getCollection({
          user: user,
          collection: 'users'
        }),
        getCollection({
          user: user,
          collection: 'customers'
        })
      ])
    })
    .then((res) => {
      customer = res[1][customerId]
      customer.ownerDetails = res[0][customer.owner]
      return customer
    })
}

function setActiveCustomer (customerId) {
    unsubscribeSnapshots();

    return updateCurrentUser({
        uid: firebaseAuth.currentUser.uid,
        customer: customerId
      })
      .then(() => {
        return getSignedInUser()
      })
      .then((user) => {
        setupListeners(user)
        return
      })
}

const extensionDataKey = 'briskine'
const defaultExtensionData = {
  showPostInstall: true,
  words: 0
}
function getExtensionData () {
  let extensionData = {}
  return browser.storage.local.get(extensionDataKey)
    .then((data) => {
      extensionData = Object.assign({}, defaultExtensionData, data[extensionDataKey])

      return browser.storage.local.get('words')
    })
    .then((stats) => {
      // backwards compatibility for stats
      if (extensionData.words === 0 && stats && stats.words) {
        extensionData.words = stats.words;
      }

      return extensionData
    })
}

function setExtensionData (params = {}) {
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

export default {
    getSettings: getSettings,
    getAccount: getSignedInUser,

    getCustomer: getCustomer,
    setActiveCustomer: setActiveCustomer,

    getTemplate: getTemplate,

    signin: signin,
    logout: logout,

    getSession: getSession,
    createSession: createSession,

    getExtensionData: getExtensionData,
    setExtensionData: setExtensionData
};
