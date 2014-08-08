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
            App.quicktextsPort.postMessage({text: text, field: "shortcut"});
            App.quicktextsPort.onMessage
            if (!App.quicktextsPort.onMessage.hasListeners()) {
                App.quicktextsPort.onMessage.addListener(function (msg) {
                    if (msg.action === 'insert') {
                        callback(msg.quicktexts);
                    }
                });
            }
        },
        getFiltered: function(text, callback){
            App.quicktextsPort.postMessage({text: text});
            if (!App.quicktextsPort.onMessage.hasListeners()) {
                App.quicktextsPort.onMessage.addListener(function (msg) {
                    if (msg.action === 'list') {
                        callback(msg.quicktexts);
                    }
                });
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

App.quicktextsPort = chrome.runtime.connect({name: "quicktexts"});
if (!App.quicktextsPort.onDisconnect.hasListeners()) {
    App.quicktextsPort.onDisconnect.addListener(function(e){
        console.log("Disconnected port", e);
        console.log("Trying to reconnect");
        App.quicktextsPort = chrome.runtime.connect({name: "quicktexts"});
    });
}

App.init = function () {

    document.addEventListener("blur", App.onBlur, true);
    document.addEventListener("focus", App.onFocus, true);
    document.addEventListener("keydown", App.onKeyDown, true);
    document.addEventListener("keyup", App.onKeyUp, true);

};

$(function () {
    App.init();
});
