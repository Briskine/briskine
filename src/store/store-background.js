/* globals ENV */
import browser from 'webextension-polyfill';

import _FIRESTORE_PLUGIN from './plugin-firestore.js';

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
    }
    return Promise.resolve(lastuseCache)
}

// extend getTemplate to include lastuse_datetime
var getTemplates = function (plugin) {
    return function (params = {}) {
        return plugin.getTemplates(params)
            .then((templates) => {
                return templates.map((t) => {
                  return Object.assign({}, t, lastuseCache[t.id])
                })
            });
    };
};

function getStore () {
   var plugin = Object.assign({}, _FIRESTORE_PLUGIN);
    plugin.trigger = trigger;

    // lastuse_datetime support
    plugin.getTemplates = getTemplates(_FIRESTORE_PLUGIN);
    plugin.updateTemplateStats = updateTemplateStats;

    return plugin;
}

// global store
window.store = getStore();

function debug (data = [], method = 'log') {
    if (ENV === 'production') {
        return;
    }

    /* eslint-disable no-console */
    console.group(data.shift());
    data.forEach((item) => {
        console[method](item);
    });
    console.groupEnd();
    /* eslint-enable no-console */
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
