/* globals ENV, console */
import _FIRESTORE_PLUGIN from './plugin-firestore';
import _GORGIAS_API_PLUGIN from './plugin-api';
import './chrome-config';
import './browseraction-icon';

// can't use browser.storage
// we need a synchronous api
var firestoreSettingKey = 'firestoreEnabled';
function firestoreEnabled () {
    return (window.localStorage.getItem(firestoreSettingKey) === 'true') || false;
}

// firestore toggle
window.TOGGLE_FIRESTORE = function (enabled = false) {
    window.localStorage.setItem(firestoreSettingKey, `${enabled}`);

    refreshStore();
};

window.FIRESTORE_ENABLED = function () {
    return firestoreEnabled();
};

var signin = function (params = {}) {
    return _FIRESTORE_PLUGIN.signin(params);
};

var forgot = (params = {}) => {
    window.TOGGLE_FIRESTORE(true);
    return _FIRESTORE_PLUGIN.forgot(params);
};

var trigger = function (name) {
    // send trigger message to client store
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            type: 'trigger',
            data: {
                name: name
            }
        }, (res) => {
            if (chrome.runtime.lastError) {
                return debug(
                    [
                        'chrome.runtime.lastError',
                        chrome.runtime.lastError.message,
                        name
                    ],
                    'warn'
                );
            }

            return resolve(res);
        });
    });
};

const lastuseCache = {};
var updateTemplateStats = function (id) {
    lastuseCache[id] = {
        lastuse_datetime: new Date().toISOString()
    };
};

// extend getTemplate to include lastuse_datetime
var getTemplate = function (plugin) {
    return function (params = {}) {
        return plugin.getTemplate(params)
            .then((templates) => {
                const list = {};
                Object.keys(templates).forEach((id) => {
                    list[id] = Object.assign({}, templates[id], lastuseCache[id]);
                });
                return list;
            });
    };
};

function getStore () {
    // enable api plugin by default
    var activePlugin = _GORGIAS_API_PLUGIN;
    if (firestoreEnabled()) {
        activePlugin = _FIRESTORE_PLUGIN;
    }

    var plugin = Object.assign({}, activePlugin);

    // general signin and forgot methods for both plugins
    plugin.signin = signin;
    plugin.forgot = forgot;

    plugin.trigger = trigger;

    // lastuse_datetime support
    plugin.getTemplate = getTemplate(activePlugin);
    plugin.updateTemplateStats = updateTemplateStats;

    return plugin;
}

// global store
function refreshStore () {
    window.store = getStore();
}
refreshStore();

function debug (data = [], method = 'log') {
    if (ENV === 'production') {
        return;
    }

    console.group(data.shift());
    data.forEach((item) => {
        console[method](item);
    });
    console.groupEnd();
}

// respond to content and options
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (
        req.type &&
        typeof window.store[req.type] === 'function'
    ) {
        window.store[req.type](req.data).then((data = {}) => {
            sendResponse(data);

            // debug store calls
            debug([req.type, req.data, data]);
        }).catch((err) => {
            // catch errors on client
            var storeError = {
                storeError: err
            };
            sendResponse(storeError);

            debug([req.type, req.data, err], 'warn');
        });
    }

    return true;
});
