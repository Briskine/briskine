/* globals ENV, console */
import _FIRESTORE_PLUGIN from './plugin-firestore';

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
   var plugin = Object.assign({}, _FIRESTORE_PLUGIN);
    plugin.trigger = trigger;

    // lastuse_datetime support
    plugin.getTemplate = getTemplate(plugin);
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
