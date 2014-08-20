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
            console.log("shortcut 1");
            // add only one listener
            if (!App.shortcutPort.onMessage.hasListeners()) {
                console.log("add shortcut listener");
                App.shortcutPort.onMessage.addListener(function (msg) {
                    console.log("shortcut 2");
                    callback(msg.quicktexts);
                });
            }
            App.shortcutPort.postMessage({text: text});
        },
        getFiltered: function (text, callback) {
            // take only strings bigger than 2 chars
            if (text.length > 2) {
                console.log("filtered 1");
                if (!App.searchPort.onMessage.hasListeners()) {
                    console.log("add search listener");
                    App.searchPort.onMessage.addListener(function (msg) {
                        console.log("filtered 2");
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


App.init = function () {
    document.addEventListener("blur", App.onBlur, true);
    document.addEventListener("focus", App.onFocus, true);
    document.addEventListener("keydown", App.onKeyDown, true);
    document.addEventListener("keyup", App.onKeyUp, true);

    if (!App.shortcutPort) {
        console.log("Created shortcut port");
        App.shortcutPort = chrome.runtime.connect({name: "shortcut"});
        if (!App.shortcutPort.onDisconnect.hasListeners()) {
            App.shortcutPort.onDisconnect.addListener(function (e) {
                console.log("Disconnected port shortcut", e);
                console.log("Trying to reconnect");
                App.shortcutPort = chrome.runtime.connect({name: "shortcut"});
            });
        }
    }
    if (!App.searchPort) {
        console.log("Created search port");
        App.searchPort = chrome.runtime.connect({name: "search"});
        if (!App.shortcutPort.onDisconnect.hasListeners()) {
            App.shortcutPort.onDisconnect.addListener(function (e) {
                console.log("Disconnected port search", e);
                console.log("Trying to reconnect");
                App.shortcutPort = chrome.runtime.connect({name: "search"});
            });
        }
    }
};

// Use gmailr to call initialization only once
Gmailr.init(App.init);


