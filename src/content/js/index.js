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
        getQuicktexts: function(text, callback) {
            App.quicktextsPort.postMessage({text: text});
            App.quicktextsPort.onMessage.addListener(function(msg){
                callback(msg.quicktexts);
            });
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


App.init = function () {

    document.addEventListener("blur", App.onBlur, true);
    document.addEventListener("focus", App.onFocus, true);
    document.addEventListener("keydown", App.onKeyDown, true);
    document.addEventListener("keyup", App.onKeyUp, true);

    var chromeEventRegistry = function () {
        if (/(compose|drafts)/.test(window.location.hash)) {
            // register only one time
            if (!chrome.runtime.onMessage.hasListeners()) {
                // wait for the background page to send a message to the content script
                chrome.runtime.onMessage.addListener(
                    function (request, sender, sendResponse) {
                        // insert quicktext
                        if (request.action && request.action == 'insert') {
                            if (App.data.inCompose) {
                                var quicktext = request.quicktext;
                                var dest = document.getSelection();
                                var e = {
                                    target: dest.baseNode
                                };

                                // return focus to it's rightful owner
                                App.onFocus(e); //TODO: this loses the selection
                                App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(e);
                                App.autocomplete.cursorPosition.word = "";
                                App.autocomplete.replaceWith(quicktext);
                                App.autocomplete.justCompleted = true;
                            }
                        }
                        sendResponse("Inserted");
                    });
            }

        }
    };
    // check if we are in compose or drafts before registering any events. This prevents multiple registration of message listeners
    chromeEventRegistry();
    window.setInterval(chromeEventRegistry, 500);
};

$(function () {
    App.init();
});
