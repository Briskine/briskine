/* globals ENV, console */
import _FIRESTORE_PLUGIN from './plugin-firestore';
import _GORGIAS_API_PLUGIN from './plugin-api';
import Config from '../background/js/config';
import './chrome-config.js';

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

// handle fetch errors
var handleErrors = function (response) {
    if (!response.ok) {
        return response.clone().json().then((res) => {
            return Promise.reject(res);
        });
    }
    return response;
};

var signin = function (params = {}) {
    return fetch(`${Config.functionsUrl}/api/1/signin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json())
    .then((res) => {
        if (res.firebase) {
            window.TOGGLE_FIRESTORE(true);
            return _FIRESTORE_PLUGIN.signin(params);
        }

        window.TOGGLE_FIRESTORE(false);
        return _GORGIAS_API_PLUGIN.signin(params);
    });
};

var forgot = (params = {}) => {
    return fetch(`${Config.functionsUrl}/api/1/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    })
    .then(handleErrors)
    .then((res) => res.json())
    .then((res) => {
        if (res.firebase) {
            window.TOGGLE_FIRESTORE(true);
            return _FIRESTORE_PLUGIN.forgot(params);
        }

        window.TOGGLE_FIRESTORE(false);
        return _GORGIAS_API_PLUGIN.forgot(params);
    });
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
                    ['chrome.runtime.lastError', chrome.runtime.lastError.message],
                    'warn'
                );
            }

            return resolve(res);
        });
    });
};

function getStore () {
    // enable api plugin by default
    var plugin = Object.assign({}, _GORGIAS_API_PLUGIN);

    if (firestoreEnabled()) {
        plugin = Object.assign({}, _FIRESTORE_PLUGIN);

        // migrate legacy data
        plugin.migrate();
    }

    // general signin and forgot methods for both plugins
    plugin.signin = signin;
    plugin.forgot = forgot;

    plugin.trigger = trigger;

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
