/*
 This is the index file which is loaded first after patterns
 All declarations are done here
 */

var App = {
    data: {
        inCompose: false,      // true when textarea element is focused
        composeElement: null,  // reference to compose DOM element
        gmailView: ''         // it may be standard or basic html
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
        getFiltered: function (text, callback) {
            // take only strings bigger than 2 chars
            if (text.length > 2) {
                if (!App.searchPort.onMessage.hasListeners()) {
                    App.searchPort.onMessage.addListener(function (msg) {
                        callback(msg.quicktexts);
                    });
                }
                App.searchPort.postMessage({text: text});
            }
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
        getAutocompleteEnabled: function (callback) {
            chrome.runtime.sendMessage({'request': 'getAutocompleteEnabled'}, function (response) {
                callback(response);
            });
        },
        getAutocompleteDelay: function (callback) {
            chrome.runtime.sendMessage({'request': 'getAutocompleteDelay'}, function (response) {
                callback(response);
            });
        }
    }
};

// Add trackjs
window._trackJs = {
    token: "f4b509356dbf42feb02b2b535d8c1c85",
    application: "quicktext-chrome",
    version: chrome.runtime.getManifest().version,
    visitor: {
        enabled: false // don't collect data from user events as it might contain private information
    }
};

App.init = function () {
    document.addEventListener("blur", App.onBlur, true);
    document.addEventListener("focus", App.onFocus, true);
    document.addEventListener("keydown", App.onKeyDown, true);
    document.addEventListener("keyup", App.onKeyUp, true);
    document.addEventListener("scroll", App.onScroll, true);

    if (!App.shortcutPort) {
        App.shortcutPort = chrome.runtime.connect({name: "shortcut"});
    }

    if (!App.searchPort) {
        App.searchPort = chrome.runtime.connect({name: "search"});
    }
};

$(function () {
    App.init();
});
