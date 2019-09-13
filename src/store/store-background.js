var store = function () {
    // can't use browser.storage
    // we need a synchronous api
    var firestoreSettingKey = 'firestoreEnabled';
    var firestoreEnabled = (window.localStorage.getItem(firestoreSettingKey) === 'true') || false;
    // enable api plugin by default
    var plugin = Object.assign({}, _GORGIAS_API_PLUGIN);

    if (firestoreEnabled) {
        plugin = Object.assign({}, _FIRESTORE_PLUGIN);
        // migrate legacy data
        _FIRESTORE_PLUGIN.startup();
    }

    // firestore toggle
    window.TOGGLE_FIRESTORE = function (enabled = false) {
        window.localStorage.setItem(firestoreSettingKey, `${enabled}`);
    };

    window.FIRESTORE_ENABLED = function () {
        return firestoreEnabled;
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
                TOGGLE_FIRESTORE(true);
                return _FIRESTORE_PLUGIN.signin(params);
            }

            TOGGLE_FIRESTORE(false);
            return _GORGIAS_API_PLUGIN.signin(params);
        })
        .catch((err) => {
            if (!err.error) {
                throw {
                    error: err
                };
            }

            throw err;
        });
    };

    var forgot = (params = {}) => {
        return fetch(`${Config.functionsUrl}/api/1/reset`, {
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
                TOGGLE_FIRESTORE(true);
                return _FIRESTORE_PLUGIN.forgot(params);
            }

            TOGGLE_FIRESTORE(false);
            return _GORGIAS_API_PLUGIN.forgot(params);
        });
    };

    function subscribeIframeLoaded (e) {
        var iframe = e.target;
        var loadingClass = 'btn-loading';
        var loaderSelector = `.${loadingClass}`;
        var loader = iframe.closest(loaderSelector);
        loader.classList.remove(loadingClass);

        iframe.removeEventListener('load', subscribeIframeLoaded);
    };

    var openSubscribePopup = (params = {}) => {
        var subscribeUrl = `${Config.functionsUrl}/subscribe/`
        var $modal = $('#firestore-signup-modal');
        var iframe = $modal.find('iframe').get(0);
        $modal.modal({
            show: true
        });

        if (iframe.src !== subscribeUrl) {
            iframe.addEventListener('load', subscribeIframeLoaded);
            iframe.src = subscribeUrl;
        }
    };

    // general signin and forgot methods for both plugins
    plugin.signin = signin;
    plugin.forgot = forgot;
    plugin.openSubscribePopup = openSubscribePopup;

    // debug store calls
    var debugPlugin = {};
    Object.keys(plugin).forEach((key) => {
        debugPlugin[key] = function () {
            console.log(key, arguments[0]);
            return plugin[key].apply(null, arguments);
        };
    });

    if (ENV !== 'production') {
        return debugPlugin;
    }

    return plugin;
}();
