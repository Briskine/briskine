// chrome.gorgias.io API plugin
import _ from 'underscore';

import amplitude from '../background/js/utils/amplitude';
import Config from '../background/js/config';

var apiBaseURL = Config.apiBaseURL;
var baseURL = Config.baseURL;

function _deepClone (obj = {}) {
    return JSON.parse(JSON.stringify(obj));
}

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

var TemplateStorage = {
    set: function(data, callback) {
        chrome.storage.local.set(data, callback);
    },
    get: function(k, callback) {
        chrome.storage.local.get(k, (data) => {
            // return only templates from storage
            var filteredData = {};
            Object.keys(data).forEach((key) => {
                if (isLegacyTemplate(key, data[key])) {
                    filteredData[key] = data[key];
                }
            });
            callback(filteredData);
        });
    },
    remove: function(k, callback) {
        chrome.storage.local.remove(k, callback);
    },
    clear: function(callback) {
        chrome.storage.local.clear(callback);
    }
};

// Settings
var _localStorageSettings = {
    get: function(key, def, callback) {
        if (key in window.localStorage && window.localStorage[key] !== "") {
            return callback(JSON.parse(window.localStorage[key]));
        } else {
            if (!def) {
                // return the default in the Settings
                return callback(Settings.defaults[key]);
            } else {
                // return the supplied default
                return callback(def);
            }
        }
    },
    set: function(key, value, callback) {
        if (_.isEqual(value, Settings.defaults[key])) {
            return callback(this.clear(key));
        } else {
            window.localStorage[key] = JSON.stringify(value);
            return callback(window.localStorage[key]);
        }
    },
    clear: function(key) {
        return delete window.localStorage[key];
    }
};

var _chromeStorageSettings = {
    get: function(key, def, callback) {
        chrome.storage.sync.get(key, function(data) {
            if (
                chrome.runtime.lastError ||
                _.isEmpty(data)
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
            chrome.storage.sync.remove(key, function() {
                return callback(data);
            });
            return;
        }

        chrome.storage.sync.set(data, function() {
            chrome.storage.sync.get(key, function(data) {
                return callback(data);
            });
        });
    }
};

var Settings = {
    get: function(key, def, callback) {
        if (chrome && chrome.storage) {
            return _chromeStorageSettings.get(key, def, callback);
        } else {
            return _localStorageSettings.get(key, def, callback);
        }
    },
    set: function(key, value, callback) {
        if (chrome && chrome.storage) {
            return _chromeStorageSettings.set(key, value, callback);
        } else {
            return _localStorageSettings.set(key, value, callback);
        }
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
                enabled: true // send anonymous statistics
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

var getSettings = function (params) {
    return new Promise((resolve) => {
        Settings.get(params.key, params.def, resolve);
    });
};

var setSettings = function (params) {
    return new Promise((resolve) => {
        Settings.set(params.key, params.val, resolve);
    });
};

var handleErrors = function (response) {
    if (!response.ok) {
        return response.clone().json().then((res) => {
            return Promise.reject(res);
        });
    }
    return response;
};

var getAccount = function () {
    return fetch(`${apiBaseURL}account`)
        .then(handleErrors)
        .then((res) => res.json());
};

var setAccount = function (params) {
    return fetch(`${apiBaseURL}account`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json());
};

var getLoginInfo = function () {
    return fetch(`${apiBaseURL}login-info`)
        .then(handleErrors)
        .then((res) => res.json())
        .then((loginInfoRes) => {
            if (loginInfoRes.is_loggedin) {
                // get email from account
                return getAccount()
                    .then((res) => {
                        return fetch(`${Config.functionsUrl}/api/1/status`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                email: res.email
                            })
                        })
                        .then(handleErrors)
                        .then((res) => res.json())
                        .then((res) => {
                            if (res.firebase) {
                                // migrated to firebase
                                return {
                                    logout: true
                                };
                            }

                            return loginInfoRes;
                        });
                    });
            }

            return loginInfoRes;
        });
};

var getMembers = function (params = {}) {
    var membersApiUrl = `${apiBaseURL}members`;
    if (params.memberId) {
        membersApiUrl += `/${params.memberId}`;
    }

    return fetch(membersApiUrl)
        .then(handleErrors)
        .then((res) => res.json());
};

var setMember = function (params = {}) {
    var membersApiUrl = `${apiBaseURL}members`;
    var membersApiMethod = 'POST';
    if (params.id) {
        membersApiMethod = 'PUT';
        membersApiUrl += `/${params.id}`;
    }

    return fetch(membersApiUrl, {
        method: membersApiMethod,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json());
};

var getTemplate = function (params = {}) {
    return new Promise((resolve) => {
        TemplateStorage.get(params.id, resolve);
    });
};

var queryTemplates = function (params = {}) {
    var quicktextsApiUrl = `${apiBaseURL}quicktexts`;
    if (params.quicktextId) {
        quicktextsApiUrl += `/${params.quicktextId}`;
    }

    return fetch(quicktextsApiUrl)
        .then(handleErrors)
        .then((res) => res.json());
};

var updateRemoteTemplate = function (remote = {}) {
    return fetch(`${apiBaseURL}quicktexts/${remote.remote_id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(remote)
    })
    .then(handleErrors);
};

var updateTemplate = function (params = {}) {
    var t = params.template;
    var synced = params.synced;
    var onlyLocal = params.onlyLocal;

    // this template was synced. Update only sync_datetime and not updated_datetime
    if (synced) {
        t.sync_datetime = new Date().toISOString();
    } else {
        t.updated_datetime = t.updated_datetime || new Date().toISOString();
    }
    var data = {};
    data[t.id] = t;

    return new Promise((resolve) => {
        TemplateStorage.set(data, function () {
            if (onlyLocal) { // update only locally - don't do any remote operations
                resolve(t);
                return;
            } else {
                // Send some info about the creation of templates
                amplitude.getInstance().logEvent("Updated template", {
                    "with_subject": true ? t.subject : false,
                    "with_shortcut": true ? t.shortcut : false,
                    "with_tags": true ? t.tags : false,
                    "title_size": t.title.length,
                    "body_size": t.body.length
                });
            }

            getSettings({
                key: 'isLoggedIn'
            }).then(function (isLoggedIn) {
                if (!isLoggedIn) { // if it's not logged in
                    resolve(t);
                    return;
                }

                if (!t.remote_id) {
                    var remote = _copy(t, {});
                    return createRemoteTemplate(remote).then((res) => {
                        t.remote_id = res.id;
                        t.sync_datetime = new Date().toISOString();

                        var data = {};
                        data[t.id] = t;
                        TemplateStorage.set(data, () => resolve(t));
                    });
                } else {
                    return queryTemplates({
                        quicktextId: t.remote_id
                    }).then(function (remote) {
                        remote = _copy(t, remote);
                        return updateRemoteTemplate(remote)
                            .then(() => {
                                t.sync_datetime = new Date().toISOString();
                                var data = {};
                                data[t.id] = t;
                                TemplateStorage.set(data, () => resolve(t));
                            });
                    });
                }
            });
        });
    });
};

var createRemoteTemplate = function (remote = {}) {
    return fetch(`${apiBaseURL}quicktexts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(remote)
    })
    .then(handleErrors);
};

// WARNING we sometimes rely on mutating params.template in controllers
var createTemplate = function (params = {}) {
    var t = params.template;
    var onlyLocal = params.onlyLocal;
    var isPrivate = params.isPrivate;

    // UUID4 as an id for the template
    t.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    t.nosync = typeof t.nosync !== 'undefined' ? t.nosync : 0;
    t.deleted = 0;
    t.use_count = 0;
    t.created_datetime = new Date().toISOString();
    t.updated_datetime = t.updated_datetime || "";
    t.sync_datetime = t.sync_datetime || "";
    t.lastuse_datetime = t.lastuse_datetime || "";
    t.tags = _clean_tags(t.tags);
    t.private = !!isPrivate;

    var data = {};
    data[t.id] = t;

    return new Promise((resolve) => {
        TemplateStorage.set(data, function () {
            if (onlyLocal) { // create only locally - don't do any remote operations
                return resolve();
            } else {
                amplitude.getInstance().logEvent("Created template", {
                    "with_subject": !!t.subject,
                    "with_shortcut": !!t.shortcut,
                    "with_tags": !!t.tags,
                    "title_size": t.title.length,
                    "body_size": t.body.length,
                    "private": t.private
                });
            }

            getSettings({
                key: 'isLoggedIn'
            }).then(function (isLoggedIn) {
                if (!isLoggedIn) {
                    return resolve();
                }

                var remote = _copy(t, {});
                // make sure we don't have a remote_id (it's a new template sow there should not be any remote_id)
                remote.remote_id = '';
                createRemoteTemplate(remote)
                .then((res) => res.json())
                .then((remote) => {
                    // once it's saved server side, store the remote_id in the database
                    t.remote_id = remote.id;
                    t.sync_datetime = new Date().toISOString();
                    // WARNING we rely on mutating t, to update in data[id]=t
                    TemplateStorage.set(data, function () {
                        resolve(t);
                    });
                });
            });
        });
    });
};

var deleteRemoteTemplate = function (remote) {
    return fetch(`${apiBaseURL}quicktexts/${remote.remote_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(remote)
    })
    .then(handleErrors);
};

var deleteTemplate = function (params = {}) {
    var t = params.template;
    var onlyLocal = params.onlyLocal;

    return new Promise((resolve) => {
        if (onlyLocal || !t.remote_id) {
            TemplateStorage.remove(t.id, function () {
                resolve();
            });
        } else {
            var data = {};
            t.deleted = 1;
            data[t.id] = t;
            TemplateStorage.set(data, function () {
                if (!onlyLocal) {
                    amplitude.getInstance().logEvent("Deleted template");
                }

                return getSettings({
                    key: 'isLoggedIn'
                }).then(function (isLoggedIn) {
                    // bail if not logged-in
                    if (!isLoggedIn) {
                        return resolve();
                    }

                    queryTemplates({
                        quicktextId: t.remote_id
                    }).then(function (remote) {
                        // make sure we have the remote id otherwise the delete will not find the right resource
                        remote.remote_id = remote.id;
                        deleteRemoteTemplate(remote)
                        .then(() => {
                            // Do a local "DELETE" only if deleted remotely.
                            // If remote operation fails, try again when syncing.
                            //
                            // NOTE: We delete locally to save space.
                            TemplateStorage.remove(t.id, resolve);
                        });
                    });
                });
            });
        }
    });
};

var clearLocalTemplates = function () {
    return new Promise((resolve) => {
        TemplateStorage.clear(resolve);
    });
};

// given a string with tags give a clean list
// remove spaces, duplicates and so on
var _clean_tags = function (tags) {
    var tArray = _.filter(tags.split(','), function (tag) {
        if (tag.trim() !== '') {
            return true;
        }
    });
    tags = _.unique(_.map(tArray, function (t) {
        return t.trim();
    })).join(', ');
    return tags;
};

// Copy one template object to another - used for the remote saving
var _copy = function (source, target) {
    for (var k in source) {
        // ignore the no own property or id
        if (k === 'id' && !source.hasOwnProperty(k)) {
            continue;
        }
        if (k === 'tags') {
            target[k] = _clean_tags(source[k]);
        } else {
            target[k] = source[k];
        }
    }
    return target;
};

/* Sync: remote -> local
    - assume that there was no connectivity and now we have it
    Remote templates (after local sync):

    * Created (no similar remote_id found locally) - update sync_date
    * Updated (found remote_id - update) - update sync_date
    * Deleted (present locally, but not present in remote templates)
    */
var lastSync = null;
var syncRemote = function () {
    // Get the new or updated templates from the remote server
    return queryTemplates().then(function (remoteTemplates) {
        var now = new Date().toISOString();

        var localSeen = [];
        var remoteSeen = [];

        return getTemplate().then(function (localTemplates) {
            for (var id in localTemplates) {
                var t = localTemplates[id];
                if (t !== null && t.remote_id) {
                    localSeen.push(t.remote_id);
                }
            }

            var operations = [];

            _.each(remoteTemplates, function (remoteTemplate) {
                var localTemplate;
                var lastVersion = remoteTemplate.versions[0];

                remoteSeen.push(remoteTemplate.id);

                var updated = false;
                for (var id in localTemplates) {
                    localTemplate = localTemplates[id];

                    if (localTemplate.remote_id === remoteTemplate.id) {
                        lastVersion.private = remoteTemplate.private;
                        localTemplate = _copy(lastVersion, localTemplate);
                        localTemplate.remote_id = remoteTemplate.id;
                        // use the remote created_datetime as reference
                        localTemplate.created_datetime = remoteTemplate.created_datetime;
                        operations.push(
                            updateTemplate({
                                template: localTemplate,
                                onlyLocal: true,
                                sycned: true
                            })
                        );

                        updated = true;
                        break;
                    }
                }

                // If we haven't seen a local template, create it
                // I wish there was for..else in JS
                if (!updated) {
                    localTemplate = _copy(lastVersion, {});
                    localTemplate.remote_id = remoteTemplate.id;
                    localTemplate.sync_datetime = now;
                    operations.push(
                        createTemplate({
                            template: localTemplate,
                            onlyLocal: true
                        })
                    );
                }
            });

            // delete local templates that have a remote_id, but are not present through the API request
            var deleteLocal = _.difference(localSeen, remoteSeen);
            _.each(deleteLocal, function (remoteId) {
                TemplateStorage.get(null, function (localTemplates) {
                    _.each(localTemplates, function (localTemplate) {
                        if (localTemplate.remote_id && remoteId && localTemplate.remote_id === remoteId) {
                            operations.push(
                                deleteTemplate({
                                    template: localTemplate,
                                    onlyLocal: true
                                })
                            );
                        }
                    });
                });
            });
            lastSync = new Date();
            return Promise.all(operations);
        });
    });
};

/**
    * Local templates: local -> remote
    * Created (doesn't have a 'remote_id' set)
    * Deleted (deleted=1 in the db) - delete remotely and then completely in the db
    * Updated (sync_datetime is null or lower than the updated_date)
    *
    */
var syncLocal = function () {
    // Handling all local templates
    return getTemplate().then(function (templates) {
        for (var id in templates) {
            var t = templates[id];
            if (t === null || t.nosync !== 0) {
                continue;
            }

            // no remote_id means that it's local only and we have to sync it with the remote sync service
            if (!t.remote_id) {
                // skipping deleted templates - there should not be any.. but ok.
                if (t.deleted === 1) {
                    continue;
                }

                var tRemote = _copy(_deepClone(t), {});

                // create new template on the server
                var save = function (ut) {
                    // we're in a for loop so we need this closure here because the `t` var will be overridden
                    // before the remote request is finished
                    return function (res) {
                        ut.remote_id = res.id;
                        ut.sync_datetime = new Date().toISOString();

                        var data = {};
                        data[ut.id] = ut;
                        updateTemplate({
                            template: ut,
                            onlyLocal: true
                        });
                    };
                };

                createRemoteTemplate(tRemote).then(save(_deepClone(t)));
            } else { // was synced at some point
                // if it's deleted locally, delete it remotely and then delete it completely
                if (t.deleted === 1) {
                    var deleted = function (ut) {
                        return function (remote) {
                            remote.remote_id = ut.remote_id;
                            deleteRemoteTemplate(remote).then(() => {
                                TemplateStorage.remove(ut.id);
                            });
                        };
                    };

                    queryTemplates({
                        quicktextId: t.remote_id
                    }).then(deleted(_deepClone(t)));
                } else if (t.updated_datetime) { // only if we have an updated_datetime
                    if (!t.sync_datetime || new Date(t.sync_datetime) < new Date(t.updated_datetime)) {
                        var update = function (ut) {
                            // we're in a for loop so we need this closure here because the `t` var will be overridden
                            // before the remote request is finished
                            return function (remote) {
                                remote = _copy(ut, remote);
                                updateRemoteTemplate(remote).then(() => {
                                    ut.sync_datetime = new Date().toISOString();
                                    var data = {};
                                    data[ut.id] = ut;
                                    TemplateStorage.set(data);
                                });
                            };
                        };
                        // template was updated locally, not synced yet
                        queryTemplates({
                            quicktextId: t.remote_id
                        }).then(update(Object.assign({}, t)));
                    }
                }

                // send stats to server if we templates used
                if (t.use_count) { // if we have a use_count, then we can update the stats on the server.
                    // we need this closure to make sure we don't duplicate the same template
                    var saveCount = function (ut) {
                        return function () {
                            ut.use_count = 0;
                            var data = {};
                            data[ut.id] = ut;
                            TemplateStorage.set(data, function () {});
                        };
                    };

                    updateStats({
                        quicktext_id: t.remote_id,
                        key: 'use_count',
                        value: t.use_count
                    }).then(saveCount(_deepClone(t)));
                }
            }
        }

        lastSync = new Date();
        return lastSync;
    });
};

var syncNow = function () {
    return getSettings({
        key: 'isLoggedIn'
    }).then(function (isLoggedIn) {
        // bail if not logged-in
        if (!isLoggedIn) {
            return Promise.resolve();
        }

        syncRemote();

        console.log('Synced: ', new Date().toUTCString());
        var waitForLocal = function () {
            window.store.trigger('templates-sync');
            syncLocal();
        };
        // wait a bit before doing the local sync
        setTimeout(waitForLocal, 1000);

        return;
    });
};

var getSharing = function (params = {}) {
    if (!params.quicktext_ids || !params.quicktext_ids.length) {
        return Promise.resolve([]);
    }

    return fetch(`${apiBaseURL}share`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json());
};

var updateSharing = function (params = {}) {
    return fetch(`${apiBaseURL}share`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json());
};

var getStats = function () {
    return fetch(`${apiBaseURL}templates/stats`)
        .then(handleErrors)
        .then((res) => res.json());
};

// HACK temporarily disable the update stats method
var updateStats = function () {
    return Promise.resolve();
};

//     var updateStats = function (params = {}) {
//         return fetch(`${apiBaseURL}templates/stats`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(params)
//         })
//         .then(handleErrors)
//         .then((res) => res.json());
//     };

var getSubscription = function (params = {}) {
    var subscriptionsApiUrl = `${apiBaseURL}subscriptions`;
    if (params.subId) {
        subscriptionsApiUrl += `/${params.subId}`;
    }

    return fetch(subscriptionsApiUrl)
        .then(handleErrors)
        .then((res) => res.json());
};

var updateSubscription = function (params = {}) {
    return fetch(`${apiBaseURL}subscriptions/${params.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json());
};

var cancelSubscription = function () {
    return fetch(`${apiBaseURL}subscriptions`, {
        method: 'DELETE'
    })
    .then(handleErrors)
    .then((res) => res.json());
};

// open credit card form
var updateCreditCard = function () {
    return Promise.resolve({
        firebase: false
    });
};

var reactivateSubscription = function () {
    return Promise.resolve({
        firebase: false
    });
};

var getPlans = function () {
    return fetch(`${apiBaseURL}plans/startup`)
        .then(handleErrors)
        .then((res) => res.json());
};

var signin = function (params = {}) {
    return fetch(`${apiBaseURL}signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        })
        .then(handleErrors)
        .then((res) => res.json());
};

var logout = function () {
    return fetch(`${baseURL}logout`);
};

var forgot = function (params = {}) {
    return fetch(`${apiBaseURL}forgot`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json());
};

var importTemplates = function () {
    // need to handle upload on the client.
    // can't send file object through message.
    return Promise.resolve({
        firebase: false
    });
};

var noop = function () {
    return Promise.reject();
};

export default {
    getSettings: getSettings,
    setSettings: setSettings,

    getLoginInfo: getLoginInfo,
    getAccount: getAccount,
    setAccount: setAccount,

    getMembers: getMembers,
    setMember: setMember,

    getTemplate: getTemplate,
    updateTemplate: updateTemplate,
    createTemplate: createTemplate,
    deleteTemplate: deleteTemplate,
    clearLocalTemplates: clearLocalTemplates,

    getSharing: getSharing,
    updateSharing: updateSharing,

    getStats: getStats,
    updateStats: updateStats,

    getPlans: getPlans,
    getSubscription: getSubscription,
    updateSubscription: updateSubscription,
    cancelSubscription: cancelSubscription,
    updateCreditCard: updateCreditCard,
    reactivateSubscription: reactivateSubscription,

    syncNow: syncNow,
    syncLocal: syncLocal,

    signin: signin,
    logout: logout,
    forgot: forgot,
    importTemplates: importTemplates,

    addAttachments: noop,
    removeAttachments: noop
};
