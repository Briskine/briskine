/*
 This is the index file which is loaded first after patterns
 All declarations are done here
 */

var App = {
    data: {
        searchCache: {},
        debouncer: {}
    },
    editor_enabled: true,
    autocomplete: {},
    settings: {
        // Get quicktexts filtered out by shortcut
        getQuicktextsShortcut: function (text, callback) {

            var listener = function (msg) {
                // bind listener only once
                App.shortcutPort.onMessage.removeListener(listener);

                callback(msg.quicktexts);
            };

            App.shortcutPort.onMessage.addListener(listener);

            App.shortcutPort.postMessage({text: text});
        },
        getFiltered: function (text, limit, callback) {
            // search even the empty strings. It's not a problem because the dialog is now triggered by a user shortcut

            // use a debouncer to not trigger the filter too many times
            // use the callback function as a uuid for the debouncers

            var debouncerId = callback.toString();

            if (App.data.debouncer[debouncerId]) {
                clearTimeout(App.data.debouncer[debouncerId]);
            }

            App.data.debouncer[debouncerId] = setTimeout(function () {
                if (!App.data.searchCache[text] || !App.data.searchCache[text].length) {
                    App.searchPort.onMessage.addListener(function (msg) {
                        App.data.searchCache[text] = msg.quicktexts.slice();
                        callback(App.data.searchCache[text]);
                        App.searchPort.onMessage.removeListener(arguments.callee);
                    });
                    App.searchPort.postMessage({text: text, limit: limit});
                    // expire cache after a while
                    setTimeout(function(){
                        delete App.data.searchCache[text];
                    }, 1500);
                } else {
                    callback(App.data.searchCache[text]);
                }
            }, 200);
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

// the active plugin, based on the plugin.init response
// blank at first
App.activePlugin = {
    setTitle: function(params, callback) {
        callback();
    },
    getData: function(params, callback) {
        callback();
    },
    init: function(params, callback) {
        callback();
    }
};

// complete list of plugins
App.plugins = {};

// main plugin creation method, used by plugins
App.plugin = function(id, obj) {

    // check if plugin has all the required methods
    var requiredMethods = [
        'init',
        'getData',
        'setTitle'
    ];

    // mix in the plugin
    requiredMethods.forEach(function(prop) {
        if(!obj.hasOwnProperty(prop)) {
            throw new Error('Invalid plugin *' + id + '*! Missing method: ' + prop);
        }
    });

    App.plugins[id] = obj;

};

// run the init method on all adapters
App.activatePlugins = function() {

    var allPlugins = Object.keys(App.plugins);
    var pluginResponse = {};

    // check if all plugins were loaded
    var checkPluginsLoaded = function() {

        var pluginResponseArray = Object.keys(pluginResponse);

        if(pluginResponseArray.length === allPlugins.length) {

            // all plugins loaded
            pluginResponseArray.some(function(pluginName) {

                // find the first plugin that returned true
                // and set it as the active one
                if(pluginResponse[pluginName] === true) {
                    App.activePlugin = App.plugins[pluginName];
                    return true;
                }

                return false;

            });

        }

    };

    // trigger the init function on all plugins
    allPlugins.forEach(function(pluginName) {

        App.plugins[pluginName].init({}, function(err, response) {

            pluginResponse[pluginName] = response;

            checkPluginsLoaded();

        });

    });

};

Raven.config('https://af2f5e9fb2744c359c19d08c8319d9c5@app.getsentry.com/30379', {
    tags: {
        version: chrome.runtime.getManifest().version
    },
    linesOfContext: 11,
    fetchContext: true,
    collectWindowErrors: true
}).install();

App.init = function (settings) {

    var currentUrl = window.location.href;

    // Check if we should use editor markup
    App.settings.editor_enabled = settings.editor.enabled;

    var blacklistPrivate = [
        'https://gorgias.io'
    ];

    // create the full blacklist
    // from the editable and private one
    var fullBlacklist = [];
    [].push.apply(fullBlacklist, settings.blacklist);
    [].push.apply(fullBlacklist, blacklistPrivate);

    // check if url is in blacklist
    var isBlacklisted = false;
    fullBlacklist.some(function(item) {
        if(currentUrl.indexOf(item) !== -1) {
            isBlacklisted = true;
            return true;
        }
        return false;
    });

    if(isBlacklisted) {
        return false;
    }

    document.addEventListener("blur", App.onBlur, true);
    document.addEventListener("focus", App.onFocus, true);
    document.addEventListener("scroll", App.onScroll, true);

    // use custom keyboard shortcuts
    if (settings.keyboard.enabled) {
        Mousetrap.bindGlobal(settings.keyboard.shortcut, App.autocomplete.keyboard.completion);
    }
    if (settings.dialog.shortcut) {
        Mousetrap.bindGlobal(settings.dialog.shortcut, App.autocomplete.dialog.completion);
    }

    // create dialog once and then reuse the same element
    App.autocomplete.dialog.create();
    App.autocomplete.dialog.bindKeyboardEvents();

    App.activatePlugins();

    if (!App.shortcutPort) {
        App.shortcutPort = chrome.runtime.connect({name: "shortcut"});
    }

    if (!App.searchPort) {
        App.searchPort = chrome.runtime.connect({name: "search"});
    }

};

$(function () {
    App.settings.fetchSettings(App.init);
});
