(function () {
    // can't use browser.storage
    // we need a synchronous api
    var firestoreSettingKey = 'firestoreEnabled';
    function firestoreEnabled () {
        return (window.localStorage.getItem(firestoreSettingKey) === 'true') || false;
    }

    // firestore toggle
    window.TOGGLE_FIRESTORE = function (enabled = false) {
        window.localStorage.setItem(firestoreSettingKey, `${enabled}`);

        // switch plugin
        window.store = getStore();
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
    }

    var openSubscribePopup = (params = {}) => {
        var subscribeUrl = `${Config.functionsUrl}/subscribe/`;
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

    var trigger = function (name) {
        // send trigger message to client store
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'trigger',
                data: {
                    name: name
                }
            }, resolve);
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
        plugin.openSubscribePopup = openSubscribePopup;

        // HACK mock on() because the angular app is bundled in the background script
        plugin.on = (name) => {};
        plugin.trigger = trigger;

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

                debug([req.type, req.data, err], 'error');
            });
        }

        return true;
    });
}());
