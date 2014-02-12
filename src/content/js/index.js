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
};

$(function () {
    App.init();
});
