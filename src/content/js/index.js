/*
 This is the index file which is loaded first after patterns
 All declarations are done here
 */

var App = {
    data: {
        inCompose: false,      // true when textarea element is focused
        composeElement: null,  // reference to compose DOM element
        gmailView: '',         // it may be standard or basic html
        searchCache: {},
        debouncer: {}
    },
    autocomplete: {},
    parser: {},
    settings: {
        // Get quicktexts filtered out by shortcut
        getQuicktextsShortcut: function (text, callback) {
            // add only one listener
            if (!App.shortcutPort.onMessage.hasListeners()) {
                App.shortcutPort.onMessage.addListener(function (msg) {
                    callback(msg.quicktexts);
                });
            }
            App.shortcutPort.postMessage({text: text});
        },
        getFiltered: function (text, limit, callback) {
            // search even the empty strings. It's not a problem because the dialog is now triggered by a user shortcut

            // use a debouncer to not trigger the filter too many times
            // use the callback function as a uuid for the debouncers

            var debouncerId = callback.toString();

            if(App.data.debouncer[debouncerId]) {
                clearTimeout(App.data.debouncer[debouncerId]);
            }

            App.data.debouncer[debouncerId] = setTimeout(function() {

                if(!App.data.searchCache[text] || !App.data.searchCache[text].length) {

                    App.searchPort.onMessage.addListener(function (msg) {

                        App.data.searchCache[text] = msg.quicktexts.slice();

                        callback(msg.quicktexts);
                    });

                    App.searchPort.postMessage({text: text, limit: limit});

                } else {

                    callback(App.data.searchCache[text]);

                }

            }, 250);


        },
        get: function (key, callback) {
            chrome.runtime.sendMessage({'request': 'get', 'data': key}, function (response) {
                callback(response);
            });
        },
        stats: function (key, val, callback) {
            chrome.runtime.sendMessage({'request': 'stats', 'key': key, 'val': val}, function (response) {
                callback(response);
            });
        },
        fetchSettings: function (callback) {
            chrome.runtime.sendMessage({'request': 'settings'}, function (response) {
                callback(response);
            });
        }
    }
};

// Add trackjs
// window._trackJs = {
//    token: "f4b509356dbf42feb02b2b535d8c1c85",
//    application: "quicktext-chrome",
//    version: chrome.runtime.getManifest().version,
//    visitor: {
//        enabled: false // don't collect data from user events as it might contain private information
//    }
// };

App.init = function () {
    document.addEventListener("blur", App.onBlur, true);
    document.addEventListener("focus", App.onFocus, true);
    document.addEventListener("scroll", App.onScroll, true);

    // use custom keyboard shortcuts
    App.settings.fetchSettings(function (settings) {
        if (settings.keyboard.enabled) {
            Mousetrap.bindGlobal(settings.keyboard.shortcut, App.autocomplete.keyboard.completion);
        }
        if (settings.dialog.shortcut) {
            Mousetrap.bindGlobal(settings.dialog.shortcut, App.autocomplete.dialog.completion);
        }
    });

    if (!App.shortcutPort) {
        App.shortcutPort = chrome.runtime.connect({name: "shortcut"});
    }

    if (!App.searchPort) {
        App.searchPort = chrome.runtime.connect({name: "search"});
    }

    // create dialog once and then reuse the same element
    App.autocomplete.dialog.create();
    App.autocomplete.dialog.bindKeyboardEvents();
};

$(function () {
    App.init();
});
