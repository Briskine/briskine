import browser from 'webextension-polyfill';

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
    'getAccount',

    'getCustomer',
    'setActiveCustomer',

    'getTemplates',
    'updateTemplateStats',

    'signin',
    'logout',

    'getSession',
    'createSession',

    'getExtensionData',
    'setExtensionData'
];

var events = [];
var on = function (name, callback) {
    events.push({
        name: name,
        callback: callback
    });
};

function off (name, callback) {
  events = events.filter((e) => {
    if (e.name === name && e.callback === callback) {
      return false
    }

    return true
  })
}

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
    }
});

var optionsStore = {};
methods.forEach((method) => {
    optionsStore[method] = createRequest(method);
});

optionsStore.on = on;
optionsStore.off = off

export default optionsStore;
