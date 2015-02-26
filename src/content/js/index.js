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
            TemplateStorage.get(null, function (templates) {
                for (var id in templates) {
                    var t = templates[id];
                    if (t.deleted === 0 && t.shortcut === text) {
                        chrome.runtime.sendMessage({'request': 'insert', 'template': t});
                        callback([t]);
                        return;
                    }
                }
            });
        },
        getFiltered: function (text, limit, callback) {
            // search even the empty strings. It's not a problem because the dialog is now triggered by a user shortcut
            TemplateStorage.get(null, function (res) {
                var templates = [];
                var count = 0;
                for (var id in res) {
                    var t = res[id];
                    if (t.deleted !== 0) {
                        continue;
                    }
                    // we have some text, do the filtering
                    if (text) {
                        if (t.shortcut.indexOf(text) !== -1 ||
                            t.title.indexOf(text) !== -1 ||
                            t.body.indexOf(text) !== -1) {

                            if (limit && limit < count) {
                                break;
                            }
                            count++;
                            templates.push(t);
                        }
                    } else { // no text, get all
                        if (limit && limit < count) {
                            break;
                        }
                        count++;
                        templates.push(t);
                    }
                }
                // sort by created_datetime desc
                templates.sort(function (a, b) {
                    return new Date(b.created_datetime) - new Date(a.created_datetime);
                });

                // then sort by updated_datetime so the last one updated is first
                templates.sort(function (a, b) {
                    return new Date(b.updated_datetime) - new Date(a.updated_datetime);
                });

                // Too many requests sent. Send only once
                //chrome.runtime.sendMessage({'request': 'search', 'query_size': templates.length});
                callback(templates);
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
        fetchSettings: function (callback) {
            Settings.get("settings", "", function(settings){
                callback(settings);
            });
        }
    }
};

// the active plugin, based on the plugin.init response
// blank at first
App.activePlugin = {
    setTitle: function (params, callback) {
        callback();
    },
    getData: function (params, callback) {
        callback();
    },
    init: function (params, callback) {
        callback();
    }
};

// complete list of plugins
App.plugins = {};

// main plugin creation method, used by plugins
App.plugin = function (id, obj) {

    // check if plugin has all the required methods
    var requiredMethods = [
        'init',
        'getData',
        'setTitle'
    ];

    // mix in the plugin
    requiredMethods.forEach(function (prop) {
        if (!obj.hasOwnProperty(prop)) {
            throw new Error('Invalid plugin *' + id + '*! Missing method: ' + prop);
        }
    });

    App.plugins[id] = obj;

};

// run the init method on all adapters
App.activatePlugins = function () {

    var allPlugins = Object.keys(App.plugins);
    var pluginResponse = {};

    // check if all plugins were loaded
    var checkPluginsLoaded = function () {

        var pluginResponseArray = Object.keys(pluginResponse);

        if (pluginResponseArray.length === allPlugins.length) {

            // all plugins loaded
            pluginResponseArray.some(function (pluginName) {

                // find the first plugin that returned true
                // and set it as the active one
                if (pluginResponse[pluginName] === true) {
                    App.activePlugin = App.plugins[pluginName];
                    return true;
                }

                return false;

            });

        }

    };

    // trigger the init function on all plugins
    allPlugins.forEach(function (pluginName) {

        App.plugins[pluginName].init({}, function (err, response) {

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
    fullBlacklist.some(function (item) {
        if (currentUrl.indexOf(item) !== -1) {
            isBlacklisted = true;
            return true;
        }
        return false;
    });

    if (isBlacklisted) {
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
};

$(function () {
    App.settings.fetchSettings(App.init);
});
