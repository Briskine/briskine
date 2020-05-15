// chrome.gorgias.io API plugin
import _ from 'underscore';

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

var getLoginInfo = function () {
    return Promise.reject();
};

var getTemplate = function (params = {}) {
    return new Promise((resolve) => {
        TemplateStorage.get(params.id, resolve);
    });
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
            }

            getSettings({
                key: 'isLoggedIn'
            }).then(function (isLoggedIn) {
                if (!isLoggedIn) { // if it's not logged in
                    resolve(t);
                    return;
                }
            });
        });
    });
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
            }

            getSettings({
                key: 'isLoggedIn'
            }).then(function (isLoggedIn) {
                if (!isLoggedIn) {
                    return resolve();
                }
            });
        });
    });
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
                return getSettings({
                    key: 'isLoggedIn'
                }).then(function (isLoggedIn) {
                    // bail if not logged-in
                    if (!isLoggedIn) {
                        return resolve();
                    }
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

var syncNow = function () {
    return Promise.resolve();
};

export default {
    getSettings: getSettings,
    setSettings: setSettings,

    getLoginInfo: getLoginInfo,

    getTemplate: getTemplate,
    updateTemplate: updateTemplate,
    createTemplate: createTemplate,
    deleteTemplate: deleteTemplate,
    clearLocalTemplates: clearLocalTemplates,

    syncNow: syncNow
};
