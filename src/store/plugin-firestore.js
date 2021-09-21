/* globals ENV */
import browser from 'webextension-polyfill';

import {initializeApp} from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onIdTokenChanged,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot
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

// backwards compatible template for the angular app
function compatibleTemplate(template = {}, tags = []) {
    var cleanTemplate = Object.assign(
        {},
        template,
        {
            // backwards compatibility
            tags: tags.join(', '),
            deleted: isDeleted(template),
            private: isPrivate(template),
            remote_id: template.id,
            nosync: 0
        }
    );

    // convert dates
    return convertToNativeDates(cleanTemplate);
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
        body: {}
    };

    // deep-merge work-around
    const paramsCopy = JSON.parse(JSON.stringify(params));
    const data = Object.assign({}, defaults, paramsCopy);
    data.method = data.method.toUpperCase();

    // querystring support
    const fullUrl = new URL(url);
    if (data.method === 'GET') {
        Object.keys(data.body).forEach((key) => {
            fullUrl.searchParams.append(key, data.body[key]);
        });

        delete data.body;
    } else {
        // stringify body for non-get requests
        data.body = JSON.stringify(data.body);
    }

    // auth support
    let auth = Promise.resolve();
    if (data.authorization) {
        auth = getUserToken();
    }

    return auth.then((res) => {
            if (res) {
                data.headers.Authorization = `Bearer ${res.token}`;
            }

            return fetch(fullUrl, {
                    method: data.method,
                    headers: data.headers,
                    body: data.body
                })
                .then(handleErrors)
                .then((res) => res.json());
        });
}

// TODO deprecate, no longer used
// local data (when logged-out)
var localDataKey = 'firestoreLocalData';
function getLocalData (params = {}) {
    return new Promise((resolve) => {
        browser.storage.local.get(localDataKey).then((res) => {
            var localData = Object.assign({
                tags: {},
                templates: {}
            }, res[localDataKey]);

            var result = [];

            if (params.raw) {
                // return raw data
                result = localData;
            } else if (params.templateId) {
                // return one template
                result = localData.templates[params.templateId];
            } else {
                // return all tags or templates
                ['tags', 'templates'].some((key) => {
                    if (params[key]) {
                        // return all items as array
                        result = Object.keys(localData[key]).map((id) => {
                            return localData[key][id];
                        }).filter((item) => {
                            // don't return deleted data
                            return !item.deleted_datetime;
                        });

                        return true;
                    }
                });
            }

            resolve(result);
        });
    });
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

let settingsCache = {}
var getSettings = (forceUpdate = false) => {
  if (Object.keys(settingsCache).length && forceUpdate !== true) {
    return Promise.resolve(settingsCache)
  }

  return getSignedInUser()
    .then((user) => {
      return getDoc(doc(usersCollection, user.id))
    })
    .then((userDoc) => {
      const userData = userDoc.data()
      const userSettings = userData.settings
      settingsCache = Object.assign({}, defaultSettings, userSettings)
      return settingsCache
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

// firebaseAuth.currentUser is not a promise
// https://github.com/firebase/firebase-js-sdk/issues/462
function getCurrentUser () {
    return new Promise((resolve, reject) => {
        var unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            unsubscribe();
            resolve(user);
        }, reject);
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
function setupTemplates (user) {
  unsubscribeSnapshots()

  // refresh templates on changes
  subscribeSnapshots([
      onSnapshot(templatesOwnedQuery(user), invalidateTemplateCache),
      onSnapshot(templatesSharedQuery(user), invalidateTemplateCache),
      onSnapshot(templatesEveryoneQuery(user), invalidateTemplateCache),
      // customer changes (eg. subscription updated)
      onSnapshot(doc(customersCollection, user.customer), () => {
          return getCurrentUser().then((firebaseUser) => {
              return updateCurrentUser(firebaseUser);
          });
      }),
      // user data changed
      onSnapshot(doc(usersCollection, user.id), () => {
        // update settings
        return getSettings(true)
      })
  ]);

  // populate in-memory template cache
  return getTemplate();
}

// auth change
onIdTokenChanged(firebaseAuth, (firebaseUser) => {
    if (!firebaseUser) {
        invalidateTemplateCache();
        unsubscribeSnapshots();

        return setSignedInUser({});
    }

    return updateCurrentUser(firebaseUser).then(() => {
        return getSignedInUser()
            .then((user) => {
                return setupTemplates(user);
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

const usersCollection = collection(db, 'users');
const customersCollection = collection(db, 'customers');
const templatesCollection = collection(db, 'templates');
const tagsCollection = collection(db, 'tags');

function getTags () {
    return getSignedInUser()
        .then((user) => {
            return getDocs(query(tagsCollection, where('customer', '==', user.customer)));
        })
        .then((snapshot) => {
            return snapshot.docs.map((tag) => {
                return Object.assign({id: tag.id}, tag.data());
            });
        })
        .catch((err) => {
            if (isLoggedOut(err)) {
                // logged-out
                return getLocalData({tags: true});
            }

            throw err;
        });
}

function idsToTags (tagIds) {
    return getTags().then((existingTags) => {
        return tagIds.map((tagId) => {
            var foundTag = existingTags.find((tag) => {
                return tagId === tag.id;
            });

            if (!foundTag) {
                return '';
            }

            return foundTag.title;
        });
    });
}

function templatesOwnedQuery (user) {
    return query(
        templatesCollection,
        where('customer', '==', user.customer),
        where('owner', '==', user.id),
        where('deleted_datetime', '==', null)
    )
}

// my templates
function getTemplatesOwned (user) {
    return getDocs(templatesOwnedQuery(user));
}

function templatesSharedQuery (user) {
    return query(
      templatesCollection,
      where('customer', '==', user.customer),
      where('shared_with', 'array-contains', user.id),
      where('deleted_datetime', '==', null)
    )
}

// templates shared with me
function getTemplatesShared (user) {
    return getDocs(templatesSharedQuery(user))
}

function templatesEveryoneQuery (user) {
    return query(
      templatesCollection,
      where('customer', '==', user.customer),
      where('sharing', '==', 'everyone'),
      where('deleted_datetime', '==', null)
    )
}

// templates shared with everyone
function getTemplatesForEveryone (user) {
    return getDocs(templatesEveryoneQuery(user))
}

// template in-memory cache
var templateCache = {};
function addTemplatesToCache (templates = {}) {
    Object.keys(templates).forEach((templateId) => {
        templateCache[templateId] = templates[templateId];
    });
}

function getTemplatesFromCache (templateId) {
    if (templateId && templateCache[templateId]) {
        var list = {};
        list[templateId] = templateCache[templateId];
        return Promise.resolve(list);
    }

    if (Object.keys(templateCache).length) {
        return Promise.resolve(templateCache);
    }

    return Promise.reject();
}

function invalidateTemplateCache () {
    templateCache = {};
}

function isPrivate (template = {}) {
    return (template.sharing === 'none');
}

function isDeleted (template = {}) {
    return !!template.deleted_datetime ? 1 : 0;
}

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

var getTemplate = (params = {}) => {
    return getSignedInUser()
        .then((user) => {
            // return single template
            if (params.id) {
                var templateData = {};
                return getTemplatesFromCache(params.id)
                    .catch(() => {
                        // template not in cache
                        return getDoc(doc(templatesCollection, params.id))
                            .then((res) => res.data())
                            .then((res) => {
                                templateData = res;
                                return idsToTags(templateData.tags);
                            })
                            .then((tags) => {
                                var template = compatibleTemplate(Object.assign({
                                    id: params.id
                                }, templateData), tags);

                                // backwards compatibility
                                var list = {};
                                list[template.id] = template;
                                return list;
                            });
                    });
            }

            return getTemplatesFromCache()
                .catch(() => {
                    const isFree = (user.current_subscription.plan === 'free');
                    let templateCollections = [
                        getTemplatesOwned(user)
                    ];
                    if (!isFree) {
                        templateCollections = templateCollections.concat([
                            getTemplatesShared(user),
                            getTemplatesForEveryone(user)
                        ]);
                    }

                    // templates not cached
                    return Promise.all(templateCollections)
                    .then((res) => {
                        var mergedTemplates = [];
                        // concat all templates
                        res.forEach((query) => {
                            mergedTemplates = mergedTemplates.concat(query.docs);
                        });

                        // merge data and id
                        return mergedTemplates.map((template) => {
                            return Object.assign({
                                id: template.id
                            }, template.data());
                        });
                    })
                    .then((allTemplates) => {
                        // backward compatibility
                        // and template de-duplication (owned and sharing=everyone)
                        var templates = {};
                        return Promise.all(
                            allTemplates.map((template) => {
                                return idsToTags(template.tags).then((tags) => {
                                    templates[template.id] = compatibleTemplate(template, tags);

                                    return;
                                });
                            })
                        ).then(() => {
                            addTemplatesToCache(templates);

                            return templates;
                        });
                    });
                });
        })
        .catch((err) => {
            if (isLoggedOut(err)) {
                return getDefaultTemplates();
            }

            throw err;
        });

};

// return user and token
function getUserToken () {
    return getCurrentUser().then((currentUser) => {
        return currentUser.getIdToken(true);
    }).then((token) => {
        return getSignedInUser().then((user) => {
            return {
                user: user,
                token: token
            };
        });
    });
}

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
          // get data from users collection
          return getDoc(doc(usersCollection, firebaseUser.uid));
      })
      .then((userDoc) => {
          // get data from users collection
          const userData = userDoc.data();

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

          return getDoc(doc(customersCollection, user.customer));
      })
      .then((customer) => {
          var customerData = customer.data();
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
  return getDoc(doc(customersCollection, customerId))
    .then((res) => {
      customer = res.data();
      return getDoc(doc(usersCollection, customer.owner));
    })
    .then((res) => {
      customer.ownerDetails = res.data();
      return customer;
    });
}

function setActiveCustomer (customerId) {
    invalidateTemplateCache();
    unsubscribeSnapshots();

    return updateCurrentUser(
        Object.assign(firebaseAuth.currentUser, {customer: customerId})
    );
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
