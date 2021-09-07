import browser from 'webextension-polyfill';

var backgroundPage = null;
try {
    // getBackgroundPage() throws error in content script
    backgroundPage = browser.extension.getBackgroundPage();
} catch (err) {}

function createRequest (type) {
    return (params) => {
        return new Promise((resolve, reject) => {
            // get from background
            browser.runtime.sendMessage({
                type: type,
                data: params
            }).then((data) => {
                // handle errors
                if (data && data.storeError) {
                    return reject(data.storeError);
                }

                return resolve(data);
            });
        });
    };
}

var methods = [
    'getSettings',
    'setSettings',

    'getLoginInfo',
    'getAccount',

    'getCustomer',
    'setActiveCustomer',

    'getTemplate',
    'clearLocalTemplates',
    'updateTemplateStats',

    'signin',
    'logout',

    'getSession',
    'createSession'
];

var events = [];
var on = function (name, callback) {
    events.push({
        name: name,
        callback: callback
    });
};

var trigger = function (name) {
    events.filter((event) => event.name === name).forEach((event) => {
        if (typeof event.callback === 'function') {
            event.callback();
        }
    });
};

// handle trigger from background
browser.runtime.onMessage.addListener((req) => {
    if (
        req.type &&
        req.type === 'trigger'
    ) {
        trigger(req.data.name);
        return;
    }

    return false;
});

var optionsStore = {};
methods.forEach((method) => {
    optionsStore[method] = createRequest(method);
});

optionsStore.on = on;
optionsStore.trigger = trigger;

export default optionsStore;
