var store = function () {
    // can't use browser.storage
    // we need a synchronous api
    var firestoreSettingKey = 'firestoreEnabled';
    var firestoreEnabled = (window.localStorage.getItem(firestoreSettingKey) === 'true') || false;
    // enable api plugin by default
    // firestore plugin is temporarily dependent on the api plugin
    var plugin = _GORGIAS_API_PLUGIN;

    if (firestoreEnabled) {
        // only initialize plugin if firestore is enabled
        plugin = _FIRESTORE_PLUGIN();
    }

    // firestore toggle
    window.TOGGLE_FIRESTORE = function () {
        firestoreEnabled = !firestoreEnabled
        window.localStorage.setItem(firestoreSettingKey, firestoreEnabled);
        window.location.reload();
    };


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

    return plugin;
}();
