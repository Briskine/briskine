/* globals ENV, console */
import browser from 'webextension-polyfill';

import _FIRESTORE_PLUGIN from './plugin-firestore';

var trigger = function (name) {
    // send trigger message to client store
    return new Promise((resolve) => {
        browser.runtime.sendMessage({
                type: 'trigger',
                data: {
                    name: name
                }
            })
            .then((res) => {
                return resolve(res);
            })
            .catch(() => {
                return debug(
                    [
                        'browser.runtime.lastError',
                        browser.runtime.lastError.message,
                        name
                    ],
                    'warn'
                );
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
   var plugin = Object.assign({}, _FIRESTORE_PLUGIN);
    plugin.trigger = trigger;

    // lastuse_datetime support
    plugin.getTemplate = getTemplate(_FIRESTORE_PLUGIN);
    plugin.updateTemplateStats = updateTemplateStats;

    return plugin;
}

// global store
window.store = getStore();

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

// respond to content
browser.runtime.onMessage.addListener((req) => {
    if (
        req.type &&
        typeof window.store[req.type] === 'function'
    ) {
        return window.store[req.type](req.data).then((data = {}) => {
            // debug store calls
            debug([req.type, req.data, data]);

            return data;
        }).catch((err) => {
            debug([req.type, req.data, err], 'warn');

            // catch errors on client
            return {
                storeError:err
            };
        });
    }

    return;
});
