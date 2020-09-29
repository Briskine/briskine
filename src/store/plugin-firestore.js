import browser from 'webextension-polyfill';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';
import {defaults as _defaults, isEmpty as _isEmpty} from 'underscore';

import Config from '../config';
import firebaseConfig from './config-firebase';

// firebase
firebase.initializeApp(firebaseConfig);

var db = firebase.firestore();

function fsDate (date) {
    if (!date) {
        return firebase.firestore.Timestamp.now();
    }

    return firebase.firestore.Timestamp.fromDate(date);
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

// uuidv4
function uuid() {
    return `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, c =>
        (c ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
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

    // form post support
    if (params.form === true) {
        const $form = document.createElement('form');
        $form.setAttribute('method', params.method);
        $form.setAttribute('action', url);
        $form.setAttribute('target', '_blank');

        Object.keys(params.body).forEach((key) => {
            const $input = document.createElement('input');
            $input.type = 'hidden';
            $input.name = key;
            $input.value = params.body[key];
            $form.appendChild($input);
        });

        document.body.appendChild($form);
        $form.submit();

        return;
    }

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

// backwards compatibility
// update template list
function refreshTemplates () {
    // invalidate cache
    invalidateTemplateCache();
    // backwards compatibility
    window.store.trigger('templates-sync');
}

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

var batchLocalDataUpdate = Promise.resolve();
function updateLocalData (params = {}) {
    // batch update, to avoid overwriting data on parallel calls
    batchLocalDataUpdate = batchLocalDataUpdate.then(() => {
        return new Promise((resolve) => {
            getLocalData({raw: true}).then((res) => {
                // merge defaults with stored data
                var localData = Object.assign({
                    templates: {},
                    tags: {}
                }, res);

                ['tags', 'templates'].forEach((key) => {
                    if (params[key]) {
                        params[key].forEach((item) => {
                            // merge existing data
                            localData[key][item.id] = Object.assign({}, localData[key][item.id], item);
                        });
                    }
                });

                var localDataContainer = {};
                localDataContainer[localDataKey] = localData;
                browser.storage.local.set(localDataContainer).then(() => {
                    // refresh template list
                    refreshTemplates();

                    resolve();
                });
            });
        });
    });

    return batchLocalDataUpdate;
}

function syncLocalData () {
    var batch = db.batch();
    var user = {};
    return getSignedInUser()
        .then((res) => {
            user = res;
            return Promise.all([
                getLocalData({tags: true}),
                getLocalData({templates: true})
            ]);
        })
        .then((res) => {
            var tags = res[0];
            var templates = res[1];

            tags.forEach((tag) => {
                var ref = tagsCollection.doc(tag.id);
                delete tag.id;
                tag.customer = user.customer;
                batch.set(ref, tag);
            });

            return Promise.all(
                templates.map((template) => {
                    var ref = templatesCollection.doc(template.id);
                    var update = false;

                    return ref.get()
                        .then((res) => {
                            // template exists, check modified_datetime
                            var data = res.data();
                            var modified_datetime = new firebase.firestore.Timestamp(
                                template.modified_datetime.seconds,
                                template.modified_datetime.nanoseconds
                            );
                            if (
                                data.modified_datetime &&
                                modified_datetime.toDate() > data.modified_datetime.toDate()
                            ) {
                                update = true;

                                // sharing is set to none on new templates.
                                // prevent making existing templates private.
                                template = Object.assign(template, {
                                    sharing: data.sharing,
                                    shared_with: data.shared_with
                                });
                            }
                        })
                        .catch(() => {
                            // template doesn't exist
                            update = true;
                        })
                        .then(() => {
                            if (update) {
                                delete template.id;
                                template.owner = user.id;
                                template.customer = user.customer;
                                // convert dates
                                [
                                    'created_datetime',
                                    'deleted_datetime',
                                    'modified_datetime',
                                    'lastuse_datetime'
                                ].forEach((prop) => {
                                    if (template[prop]) {
                                        template[prop] = new firebase.firestore.Timestamp(
                                            template[prop].seconds,
                                            template[prop].nanoseconds
                                        );
                                    }
                                });

                                batch.set(ref, template, {merge: true});
                            }

                            return;
                        });
                })
            );
        })
        .then(() => {
            return batch.commit();
        })
        .then(() => {
            // clear local data
            return clearLocalTemplates();
        })
        .catch((err) => {
            if (isLoggedOut(err)) {
                // logged-out
                return;
            }

            throw err;
        });
}

// migrate legacy local (logged-out) templates to new local format.
// check if storage item is legacy template
function isLegacyTemplate (key = '', template = {}) {
    return (
        // key is uuid
        key.length === 36 && key.split('-').length === 5 &&
        // template has body
        template.body &&
        // template has id
        template.id
    );
}

function migrateLegacyLocalData () {
    return new Promise((resolve) => {
        browser.storage.local.get(null).then(resolve);
    }).then((storage) => {
        return Promise.all(
            Object.keys(storage || {}).map((key) => {
                var template = storage[key];
                if (isLegacyTemplate(key, template)) {
                    var localId = template.id;
                    var remoteId = template.remote_id || localId;

                    return parseTemplate({
                        template: template
                    }).then((res) => {
                        // update local data
                        return updateLocalData({
                            templates: [
                                Object.assign({id: remoteId}, res)
                            ]
                        }).then(() => {
                            return localId;
                        });
                    });
                }

                return;
            })
        );
    }).then((ids = []) => {
        const migratedTemplates = ids.filter((id) => !!id);
        // delete legacy data
        browser.storage.local.remove(migratedTemplates);
        return;
    });
}

function splitFullName (fullname = '') {
    const nameParts = fullname.trim().split(' ');
    const firstName = nameParts.shift();
    const lastName = nameParts.join(' ');

    return {
        firstName: firstName,
        lastName: lastName
    };
}

var _browserStorageSettings = {
    get: function(key, def, callback) {
        browser.storage.sync.get(key).then(function(data) {
            if (
                browser.runtime.lastError ||
                _isEmpty(data)
            ) {
                if (!def) {
                    return callback(Settings.defaults[key]);
                } else {
                    return callback(def);
                }
            } else {
                return callback(data[key]);
            }
        });
    },
    set: function(key, value, callback) {
        var data = {};
        data[key] = value;

        // remove value/reset default
        if (typeof value === 'undefined') {
            browser.storage.sync.remove(key).then(function() {
                return callback(data);
            });
            return;
        }

        browser.storage.sync.set(data).then(function() {
            browser.storage.sync.get(key).then(function(data) {
                return callback(data);
            });
        });
    }
};

var Settings = {
    get: function(key, def, callback) {
        return _browserStorageSettings.get(key, def, callback);
    },
    set: function(key, value, callback) {
        return _browserStorageSettings.set(key, value, callback);
    },
    defaults: {
        settings: {
            // settings for the settings view
            dialog: {
                enabled: true,
                shortcut: "ctrl+space", // shortcut that triggers the complete dialog
                auto: false, //trigger automatically while typing - should be disabled cause it's annoying sometimes
                delay: 1000, // if we want to trigger it automatically
                limit: 100 // how many templates are shown in the dialog
            },
            qaBtn: {
                enabled: true,
                shownPostInstall: false,
                caseSensitiveSearch: false,
                fuzzySearch: true
            },
            keyboard: {
                enabled: true,
                shortcut: "tab"
            },
            stats: {
                enabled: false // send anonymous statistics
            },
            blacklist: [],
            fields: {
                tags: false,
                subject: true
            },
            editor: {
                enabled: true // new editor - enable for new users
            }
        },
        // refactor this into 'local' and 'remote'
        isLoggedIn: false,
        syncEnabled: false,
        words: 0,
        syncedWords: 0,
        lastStatsSync: null,
        lastSync: null,
        hints: {
            postInstall: true,
            subscribeHint: true
        }
    }
};

var getLocalSettings = function (params) {
    return new Promise((resolve) => {
        Settings.get(params.key, params.def, resolve);
    });
};

var setLocalSettings = function (params) {
    return new Promise((resolve) => {
        Settings.set(params.key, params.val, resolve);
    });
};

let cachedSettings = null;
var getSettings = (params = {}) => {
    if (params.key === 'settings') {
        let localSettings = {};
        return getLocalSettings(params)
            .then((settings) => {
                localSettings = settings;
                if (cachedSettings) {
                    return cachedSettings;
                }

                return getSignedInUser()
                    .then((user) => {
                        return usersCollection.doc(user.id).get();
                    })
                    .then((userDoc) => {
                        const userData = userDoc.data();
                        const userSettings = userData.settings;
                        const settings = Object.assign(defaultSettings(localSettings), userSettings);

                        // backwards compatibility
                        // map to old format
                        cachedSettings = Object.assign({}, localSettings, {
                            name: splitFullName(userData.full_name),
                            keyboard: {
                                enabled: settings.expand_enabled,
                                shortcut: settings.expand_shortcut
                            },
                            dialog: {
                                enabled: settings.dialog_enabled,
                                shortcut: settings.dialog_shortcut,
                                limit: settings.dialog_limit
                            },
                            qaBtn: {
                                enabled: settings.dialog_button
                            },
                            editor: {
                                enabled: settings.rich_editor
                            },
                            blacklist: settings.blacklist,
                            is_sort_template_dialog_gmail: settings.dialog_sort,
                            is_sort_template_list: settings.dashboard_sort
                        });

                        return cachedSettings;
                    })
                    .catch(() => {
                        // return api-plugin settings when logged-out
                        return localSettings;
                    });
            });

    }

    return getLocalSettings(params);
};

var setSettings = (params = {}) => {
    if (params.key === 'settings') {
        return setLocalSettings(params)
            .then(() => {
                return syncSettings(true);
            });
    }

    return setLocalSettings(params);
};

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

// firebase.auth().currentUser is not a promise
// https://github.com/firebase/firebase-js-sdk/issues/462
function getCurrentUser () {
    return new Promise((resolve, reject) => {
        var unsubscribe = firebase.auth().onAuthStateChanged((user) => {
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

// auth change
firebase.auth().onAuthStateChanged((firebaseUser) => {
    if (!firebaseUser) {
        invalidateTemplateCache();
        unsubscribeSnapshots();

        return setSignedInUser({});
    }

    return updateCurrentUser(firebaseUser).then(() => {
        return getSignedInUser()
            .then((user) => {
                // refresh templates on changes
                subscribeSnapshots([
                    templatesOwnedQuery(user).onSnapshot(refreshTemplates),
                    templatesSharedQuery(user).onSnapshot(refreshTemplates),
                    templatesEveryoneQuery(user).onSnapshot(refreshTemplates),
                    // customer changes (eg. subscription updated)
                    customersCollection.doc(user.customer).onSnapshot(() => {
                        updateCurrentUser(firebaseUser);
                    })
                ]);

                // populate in-memory template cache
                getTemplate();
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

var getLoginInfo = getSignedInUser;
var getAccount = getSignedInUser;

var usersCollection = db.collection('users');
var customersCollection = db.collection('customers');
var templatesCollection = db.collection('templates');
var tagsCollection = db.collection('tags');

function getTags () {
    return getSignedInUser()
        .then((user) => {
            return tagsCollection.where('customer', '==', user.customer).get();
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

function createTags (tags = []) {
    if (!tags.length) {
        return Promise.resolve([]);
    }

    var newTags = tags.map((tag) => {
        var newTag = {
            title: tag,
            version: 1
        };
        return Object.assign({
            id: uuid()
        }, newTag);
    });

    return getSignedInUser()
        .then((user) => {
            var batch = db.batch();
            newTags.forEach((tag) => {
                var ref = tagsCollection.doc(tag.id);
                var tagData = {
                    customer: user.customer,
                    title: tag.title,
                    version: tag.version
                };
                batch.set(ref, tagData);
            });

            return batch.commit();
        })
        .catch((err) => {
            if (isLoggedOut(err)) {
                // logged-out
                return updateLocalData({
                    tags: newTags
                });
            }

            throw err;
        })
        .then(() => newTags);
}

function tagsToArray (tagsString = '') {
    return (tagsString || '').split(',').map((tag) => {
        return (tag || '').trim();
    }).filter((tag) => !!tag);
}

// replace tag titles with ids
function tagsToIds (templateTags) {
    return getTags().then((existingTags) => {
        // tags to be created
        var newTags = templateTags.filter((tag) => {
            return !(existingTags.some((existing) => {
                return existing.title === tag;
            }));
        });

        return createTags(newTags).then((createdTags) => {
            // merge existing tags with created tags
            var updatedTags = existingTags.concat(createdTags);

            // map template tag titles to ids
            return templateTags.map((tag) => {
                return (
                    updatedTags.find((existingTag) => {
                        return existingTag.title === tag;
                    }) || {}
                ).id;
            });
            });
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

function parseTemplate (params = {}) {
    // private by default
    // sharing later set by updateSharing
    var sharing = 'none';
    var shared_with = [];
    var createdDatetime = params.template.created_datetime ? new Date(params.template.created_datetime) : null;
    var modifiedDatetime = params.template.modified_datetime ? new Date(params.template.modified_datetime) : null;
    var deletedDatetime = params.template.deleted_datetime ? new Date(params.template.deleted_datetime) : null;
    var lastuseDatetime = params.template.lastuse_datetime ? new Date(params.template.lastuse_datetime) : null;

    var template = {
        title: params.template.title || null,
        body: params.template.body || null,
        shortcut: params.template.shortcut || '',
        subject: params.template.subject || '',
        cc: params.template.cc || '',
        bcc: params.template.bcc || '',
        to: params.template.to || '',
        attachments: params.template.attachments || [],
        created_datetime: fsDate(createdDatetime),
        modified_datetime: fsDate(modifiedDatetime),
        deleted_datetime: deletedDatetime ? fsDate(deletedDatetime) : null,
        shared_with: shared_with,
        sharing: sharing,
        tags: [],
        owner: null,
        customer: null,
        // stats
        lastuse_datetime: lastuseDatetime ? fsDate(lastuseDatetime) : null,
        use_count: 0,
        version: 1
    };

    // clean-up template tags
    var templateTags = tagsToArray(params.template.tags || '');

    return getSignedInUser()
        .then((user) => {
            template = Object.assign(template, {
                owner: user.id,
                customer: user.customer
            });
            return;
        }).catch((err) => {
            if (isLoggedOut(err)) {
                // logged-out
                return;
            }

            throw err;
        }).then(() => {
            return tagsToIds(templateTags);
        }).then((tags) => {
            return Object.assign(template, {
                tags: tags
            });
        });
}

function templatesOwnedQuery (user) {
    return templatesCollection
        .where('customer', '==', user.customer)
        .where('owner', '==', user.id)
        .where('deleted_datetime', '==', null);
}

// my templates
function getTemplatesOwned (user) {
    return templatesOwnedQuery(user)
        .get();
}

function templatesSharedQuery (user) {
    return templatesCollection
        .where('customer', '==', user.customer)
        .where('shared_with', 'array-contains', user.id)
        .where('deleted_datetime', '==', null);
}

// templates shared with me
function getTemplatesShared (user) {
    return templatesSharedQuery(user)
        .get();
}

function templatesEveryoneQuery (user) {
    return templatesCollection
        .where('customer', '==', user.customer)
        .where('sharing', '==', 'everyone')
        .where('deleted_datetime', '==', null);
}

// templates shared with everyone
function getTemplatesForEveryone (user) {
    return templatesEveryoneQuery(user)
        .get();
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
                        return templatesCollection.doc(params.id).get()
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
                    // templates not cached
                    return Promise.all([
                        getTemplatesOwned(user),
                        getTemplatesShared(user),
                        getTemplatesForEveryone(user)
                    ])
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

// delete logged-out data
var clearLocalTemplates = () => {
    return new Promise((resolve) => {
        var localDataContainer = {};
        localDataContainer[localDataKey] = {};
        browser.storage.local.set(localDataContainer).then(() => {
            refreshTemplates();
            return resolve();
        });
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
    var userId = firebaseUser.uid;
    var user = {
        id: userId,
        email: firebaseUser.email,
        created_datetime: new Date(firebaseUser.metadata.creationTime)
    };

    // HACK firestore throws an insufficient permissions error
    // if we trigger immediately after signInWithEmailAndPassword()
    var delay = new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    return delay
        .then(() => {
            // get data from users collection
            return usersCollection.doc(userId).get();
        })
        .then((userDoc) => {
            // get data from users collection
            var userData = userDoc.data();
            user = Object.assign(user, {
                // only support one customer for now
                customer: userData.customers[0],
                // backwards compatibility
                info: {
                    name: userData.full_name,
                    share_all: userData.share_all || false
                },
                editor: {
                    enabled: true
                },
                is_loggedin: true,
                created_datetime: '',
                current_subscription: {
                    active: false,
                    created_datetime: '',
                    plan: '',
                    quantity: 1
                },
                is_staff: false
            });

            return customersCollection.doc(user.customer).get();
        })
        .then((customer) => {
            var customerData = customer.data();
            var isCustomer = false;
            if (customerData.owner === user.id) {
                isCustomer = true;
            }

            user = Object.assign({
                is_customer: isCustomer
            }, user);

            // subscription data
            user.current_subscription = Object.assign(user.current_subscription, {
                plan: customerData.subscription.plan,
                quantity: customerData.subscription.quantity
            });

            if (!customerData.subscription.canceled_datetime) {
                user.current_subscription.active = true;
            }

            return setSignedInUser(user);
        });
}

var signin = (params = {}) => {
    return firebase.auth().signInWithEmailAndPassword(params.email, params.password)
        .then((authRes) => {
            return updateCurrentUser(authRes.user);
        })
        .then(() => {
            return createSession();
        })
        .then(() => {
            syncNow();

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
    return firebase.auth().signOut()
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
    return firebase.auth().signInWithCustomToken(token)
        .then((res) => {
            return updateCurrentUser(res.user);
        })
        .then(() => {
            syncNow();

            return window.store.trigger('login');
        });
}

var impersonate = function (params = {}) {
    return request(`${Config.functionsUrl}/api/1/impersonate`, {
            method: 'POST',
            authorization: true,
            body: {
                uid: params.id
            }
        })
        .then((res) => {
            return signinWithToken(res.token);
        });
};

// make impersonate public
window.IMPERSONATE = impersonate;

// map old settings to new format
function defaultSettings (oldSettings = {}) {
    const defaults = {
        // tab expand
        expand_enabled: true,
        expand_shortcut: 'tab',
        // dialog
        dialog_enabled: true,
        dialog_button: true,
        dialog_shortcut: 'ctrl+space',
        dialog_limit: 100,
        // dialog sort alphabetically
        dialog_sort: false,
        // rich editor
        rich_editor: true,
        // blacklist
        blacklist: [],
        // dashboard sort alphabetically
        dashboard_sort: false,
    };

    const mappedSettings = {
        expand_enabled: oldSettings.keyboard.enabled,
        expand_shortcut: oldSettings.keyboard.shortcut,
        dialog_enabled: oldSettings.dialog.enabled,
        dialog_button: oldSettings.qaBtn.enabled,
        dialog_shortcut: oldSettings.dialog.shortcut,
        dialog_limit: oldSettings.dialog.limit,
        dialog_sort: oldSettings.is_sort_template_dialog_gmail,
        rich_editor: oldSettings.editor.enabled,
        blacklist: oldSettings.blacklist,
        dashboard_sort: oldSettings.is_sort_template_list
    };

    // merge default with existing
    return _defaults(Object.assign({}, mappedSettings), defaults);
}

// save local settings in the db
function syncSettings (forceLocal = false) {
    // invalidate settings cache
    cachedSettings = null;
    const settingsMap = {};
    const getSettingsParams = {
        key: 'settings'
    };
    const getSettingsPromise = forceLocal ? getLocalSettings(getSettingsParams) : getSettings(getSettingsParams);

    return getSettingsPromise
        .then((res) => {
            const settings = defaultSettings(res);
            Object.keys(settings).forEach((key) => {
                settingsMap[`settings.${key}`] = settings[key];
            });

            return getSignedInUser();
        })
        .then((user) => {
            return usersCollection.doc(user.id).update(settingsMap);
        })
        .catch((err) => {
            if (isLoggedOut(err)) {
                // logged-out
                return;
            }

            throw err;
        });
}

// sync local data when starting the app
var syncNow = function () {
    // migrate legacy templates from browser storage
    return migrateLegacyLocalData()
        .then(() => {
            // sync local templates
            return syncLocalData();
        })
        .then(() => {
            return syncSettings();
        });
};

window.addEventListener('message', function (event) {
    if (event.data.type === 'gorgias_message' && event.data.message === 'subscribe_success') {
        updateCurrentUser(firebase.auth().currentUser);
        window.store.trigger('subscribe-success');
    }
});

export default {
    getSettings: getSettings,
    setSettings: setSettings,

    getLoginInfo: getLoginInfo,
    getAccount: getAccount,

    getTemplate: getTemplate,
    clearLocalTemplates: clearLocalTemplates,

    signin: signin,
    logout: logout,

    getSession: getSession,
    createSession: createSession
};
