var store = function () {
    // can't use browser.storage
    // we need a synchronous api
    var firestoreSettingKey = 'firestoreEnabled';
    var firestoreEnabled = (window.localStorage.getItem(firestoreSettingKey) === 'true') || false;
    // enable api plugin by default
    var plugin = _GORGIAS_API_PLUGIN;

    if (firestoreEnabled) {
        plugin = _FIRESTORE_PLUGIN;
    }

    // firestore toggle
    window.TOGGLE_FIRESTORE = function (enabled = false) {
        window.localStorage.setItem(firestoreSettingKey, `${enabled}`);
    };

    window.FIRESTORE_ENABLED = function () {
        return firestoreEnabled
    }

    // respond to content
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        if (
            req.type &&
            typeof plugin[req.type] === 'function'
        ) {
            plugin[req.type](req.data).then((data) => {
                if (typeof data !== 'undefined') {
                    sendResponse(data);
                }
            }).catch((err) => console.err(err));
        }

        return true;
    });

    // debug store calls
    var debugPlugin = {};
    Object.keys(plugin).forEach((key) => {
        debugPlugin[key] = function (params) {
            console.log(key, params);
            return plugin[key].call(null, params);
        };
    });

    if (ENV !== 'production') {
        return debugPlugin
    }

    return plugin;
}();
