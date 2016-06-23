/*
 This is the index file which is loaded first after patterns
 All declarations are done here
 */


var App = {
    data: {
        searchCache: {},
        debouncer: {},
        lastFilterRun: 0
    },
    editor_enabled: true,
    autocomplete: {},
    settings: {
        suggestions_enabled: false,
        case_sensitive_search: true,

        // Get template filtered out by shortcut
        getQuicktextsShortcut: function (text, callback) {
            TemplateStorage.get(null, function (templates) {
                for (var id in templates) {
                    var t = templates[id];
                    if (t.deleted === 0 && t.shortcut === text) {
                        chrome.runtime.sendMessage({
                            'request': 'track',
                            'event': 'Inserted template',
                            'data': {
                                "id": t.id,
                                "source": "keyboard",
                                "title_size": t.title.length,
                                "body_size": t.body.length
                            }
                        });
                        callback([t]);
                        return;
                    }
                }
            });
        },
        getFiltered: function (text, limit, callback) {

            // use a debouncer to not trigger the filter too many times
            // use the callback function as a uuid for the debouncers

            var debouncerId = callback.toString();
            var debouncerTime = 0;

            // check if the function was previsouly called
            // earlier than X ms ago.
            // if it was, debounce the next run.
            // we do this to make sure the first independent run,
            // not part of a succession of runs
            // (keyup events one after the other),
            // runs instantly, and does not have any delay.
            // helps with the dialog show delay.
            if (Date.now() - App.data.lastFilterRun < 400) {
                debouncerTime = 400;

                if (App.data.debouncer[debouncerId]) {
                    clearTimeout(App.data.debouncer[debouncerId]);
                }
            }

            App.data.debouncer[debouncerId] = setTimeout(function () {

                // search even the empty strings. It's not a problem because the dialog is now triggered by a user shortcut
                TemplateStorage.get(null, function (res) {
                    var templates = [];
                    for (var id in res) {
                        var t = res[id];
                        if (t.deleted !== 0) {
                            continue;
                        }
                        // we have some text, do the filtering
                        if (text) {
                            var templateRegex = new RegExp(text, App.settings.case_sensitive_search ? '' : 'i');

                            if (templateRegex.test([t.shortcut, t.title, t.body].join())) {
                                templates.push(t);
                            }
                        }
                        else { // no text, get all
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

                    // sort by lastuse_datetime desc
                    templates.sort(function (a, b) {
                        if (!a.lastuse_datetime) {
                            a.lastuse_datetime = new Date(0);
                        }

                        if (!b.lastuse_datetime) {
                            b.lastuse_datetime = new Date(0);
                        }
                        return new Date(b.lastuse_datetime) - new Date(a.lastuse_datetime);
                    });

                    if (limit && limit < templates.length) {
                        templates = templates.splice(0, limit);
                    }
                    callback(templates);
                });

            }, debouncerTime);

            App.data.lastFilterRun = Date.now();
        },
        stats: function (key, val, callback) {
            chrome.runtime.sendMessage({'request': 'stats', 'key': key, 'val': val}, function (response) {
                callback(response);
            });
        },
        fetchSettings: function (callback, doc, disablePlugins) {
            Settings.get("settings", "", function (settings) {
                callback(settings, doc, disablePlugins);
            });
        },
        isLoggedIn: function (callback) {
            Settings.get("isLoggedIn", "", function (isLoggedIn) {
                callback(isLoggedIn);
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

App.init = function (settings, doc) {
    var body = $(doc).find('body');

    if (!body.length || body.hasClass('gorgias-loaded')) {
        return;
    }
    // mark the doc that extension has been loaded
    body.addClass('gorgias-loaded');

    var currentUrl = window.location.href;

    App.settings.suggestions_enabled = settings.suggestions.enabled;
    // Check if we should use editor markup
    App.settings.editor_enabled = settings.editor.enabled;
    // Check if case sensitive search is enabled
    App.settings.case_sensitive_search = settings.qaBtn.caseSensitiveSearch;

    var blacklistPrivate = [
        'https://gorgias.io',
        'https://usecanvas.com',
        'http://usecanvas.com'
    ];

    // create the full blacklist
    // from the editable and private one
    var fullBlacklist = [];
    [].push.apply(fullBlacklist, settings.blacklist);
    [].push.apply(fullBlacklist, blacklistPrivate);

    // check if url is in blacklist
    var isBlacklisted = false;
    fullBlacklist.some(function (item) {
        if (item && currentUrl.indexOf(item) !== -1) {
            isBlacklisted = true;
            return true;
        }
        return false;
    });

    if (isBlacklisted) {
        return false;
    }

    // This is used to open the Chrome extension options from a HTML page - it's when you signup you'd be redirected
    // directly to the extension
    document.addEventListener("launchGorgias", function() {
        chrome.runtime.sendMessage({request: 'launchGorgias'});
    });

    doc.addEventListener("blur", App.onBlur, true);
    doc.addEventListener("focus", App.onFocus, true);
    doc.addEventListener("scroll", App.onScroll, true);

    // use custom keyboard shortcuts
    if (settings.keyboard.enabled) {
        Mousetrap.bindGlobal(settings.keyboard.shortcut, App.autocomplete.keyboard.completion);
    }
    if (settings.dialog.enabled) {
        if (settings.qaBtn.enabled) {
            App.autocomplete.dialog.createQaBtn();
        }
        if (settings.dialog.limit) {
            App.autocomplete.dialog.RESULTS_LIMIT = settings.dialog.limit;
        }
        Mousetrap.bindGlobal(settings.dialog.shortcut, App.autocomplete.dialog.completion);

        // create dialog once and then reuse the same element
        App.autocomplete.dialog.create();
        App.autocomplete.dialog.bindKeyboardEvents(doc);
    }

    var isGmailUIFrame = function () {
        try {
            return doc.getElementsByClassName('aic').length > 0;
        } catch (e) {
            return false;
        }
    };

    var loadSidebar = function () {
        if (isGmailUIFrame()) {
            if (settings.sidebar && settings.sidebar.enabled && settings.sidebar.url) {
                console.log("Loading sidebar");
                App.sidebar.enabled = true;
                if (window.sidebarTimer) {
                    window.clearInterval(window.sidebarTimer);
                }

                // Periodically check if we need to display the sidebar
                window.sidebarTimer = window.setInterval(function () {
                    App.sidebar.check(settings.sidebar.url);
                }, 1000);
            }
        }
    };
    loadSidebar();

    var pollSidebar = function (timeout) {
        if (!(settings.sidebar.enabled && settings.sidebar.url)) {
            return;
        }
        window.setTimeout(function () {
            if (!App.sidebar.enabled && isGmailUIFrame()) {
                console.log("Attempt at loading sidebar");
                loadSidebar();
            }
        }, timeout);
    };
    pollSidebar(5000);
    pollSidebar(10000);
    pollSidebar(30000);

    App.activatePlugins();
};

$(function () {
    if (document.contentType !== 'text/html') {
        return; // don't load gorgias in non html pages (json, xml, etc..)
    }

    //console.log("Loaded Gorgias in", window.location.href);
    App.settings.fetchSettings(App.init, window.document);
});
