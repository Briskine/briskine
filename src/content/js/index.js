/*
 This is the index file which is loaded first after patterns
 All declarations are done here
 */

import '../css/content.styl';
import $ from 'jquery';
import Fuse from 'fuse.js';
// creates global window.Mousetrap
import 'mousetrap';
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import './content-helpers';
import './events';
import '../../common/helpers';

import store from '../../store/store-client';
import keyboard from './keyboard';
import dialog from './dialog';
import PubSub from './patterns';

// TODO common/helpers requires global jquery and fuse.js
window.$ = $;
window.Fuse = Fuse;

var App = {
    data: {
        searchCache: {},
        debouncer: {},
        lastFilterRun: 0
    },
    editor_enabled: true,
    // TODO move settings to module
    settings: {
        case_sensitive_search: false,
        fuzzy_search: true,
        is_sort_template_list: false,
        is_sort_template_dialog_gmail: false,

        // Get template filtered out by shortcut
        getQuicktextsShortcut: function(text, callback) {
            store.getTemplate().then((templates) => {
                for (var id in templates) {
                    var t = templates[id];
                    if (t.deleted === 0 && t.shortcut === text) {
                        chrome.runtime.sendMessage({
                            request: "track",
                            event: "Inserted template",
                            data: {
                                id: t.id,
                                source: "keyboard",
                                title_size: t.title.length,
                                body_size: t.body.length
                            }
                        });
                        callback([t]);
                        return;
                    }
                }
            });
        },

        getFiltered: function(text, limit, callback) {
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

            App.data.debouncer[debouncerId] = setTimeout(function() {
                // search even the empty strings. It's not a problem because the dialog is now triggered by a user shortcut
                store.getTemplate().then((res) => {
                    var templates = [];
                    for (var t in res) {
                        if (!res[t].deleted) {
                            templates.push(res[t]);
                        }
                    }
                    if (text) {
                        var threshold = 0.6;
                        if (!App.settings.fuzzy_search) {
                            threshold = 0;
                        }

                        var options = {
                            caseSensitive: App.settings.case_sensitive_search,
                            threshold: threshold
                        };

                        templates = fuzzySearch(templates, text, options);
                    } else {
                        // Sort templates only if no search was used

                        // sort by created_datetime desc
                        templates.sort(function(a, b) {
                            return (
                                new Date(b.created_datetime) -
                                new Date(a.created_datetime)
                            );
                        });

                        // then sort by updated_datetime so the last one updated is first
                        templates.sort(function(a, b) {
                            return (
                                new Date(b.updated_datetime) -
                                new Date(a.updated_datetime)
                            );
                        });

                        if (App.settings.is_sort_template_dialog_gmail) {
                            // Sort the filtered template alphabetically
                            templates.sort(function(a, b) {
                                return a.title.localeCompare(b.title);
                            });
                        } else {
                            // sort by lastuse_datetime desc
                            templates.sort(function(a, b) {
                                if (!a.lastuse_datetime) {
                                    a.lastuse_datetime = new Date(0);
                                }

                                if (!b.lastuse_datetime) {
                                    b.lastuse_datetime = new Date(0);
                                }
                                return (
                                    new Date(b.lastuse_datetime) -
                                    new Date(a.lastuse_datetime)
                                );
                            });
                        }

                        // Apply template limit
                        if (limit && limit < templates.length) {
                            templates = templates.slice(0, limit);
                        }
                    }
                    callback(templates);
                });
            }, debouncerTime);

            App.data.lastFilterRun = Date.now();
        },
        stats: function(key, val, callback) {
            chrome.runtime.sendMessage(
                { request: 'stats', key: key, val: val },
                function(response) {
                    callback(response);
                }
            );
        },
        fetchSettings: function(callback, doc, disablePlugins) {
            store.getSettings({
                key: 'settings'
            }).then((settings) => {
                callback(settings, doc, disablePlugins);
            });
        },
        isLoggedIn: function(callback) {
            store.getSettings({
                key: 'isLoggedIn'
            }, function(isLoggedIn) {
                callback(isLoggedIn);
            });
        }
    }
};

App.init = function(settings, doc) {
    var body = $(doc).find("body");

    if (!body.length || body.hasClass("gorgias-loaded")) {
        return;
    }
    // mark the doc that extension has been loaded
    body.addClass("gorgias-loaded");

    var currentUrl = window.location.href;

    // Check if we should use editor markup
    App.settings.editor_enabled = settings.editor.enabled;
    // Check if case sensitive search is enabled
    App.settings.case_sensitive_search = settings.qaBtn.caseSensitiveSearch;
    // Check if fuzzy search is enabled
    if (typeof settings.qaBtn.fuzzySearch === "undefined") {
        App.settings.fuzzy_search = true;
    } else {
        App.settings.fuzzy_search = settings.qaBtn.fuzzySearch;
    }

    App.settings.is_sort_template_list = settings.is_sort_template_list;
    App.settings.is_sort_template_dialog_gmail =
        settings.is_sort_template_dialog_gmail;

    var blacklistPrivate = [
        "https://gorgias.io",
        "https://usecanvas.com",
        "http://usecanvas.com"
    ];

    // create the full blacklist
    // from the editable and private one
    var fullBlacklist = [];
    [].push.apply(fullBlacklist, settings.blacklist);
    [].push.apply(fullBlacklist, blacklistPrivate);

    // check if url is in blacklist
    var isBlacklisted = false;
    fullBlacklist.some(function(item) {
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
        chrome.runtime.sendMessage({ request: "launchGorgias" });
    });

    doc.addEventListener("blur", (e) => {
        PubSub.publish('blur', e);
    }, true);
    doc.addEventListener("scroll", (e) => {
        PubSub.publish('scroll', e);
    }, true);

    // use custom keyboard shortcuts
    if (settings.keyboard.enabled) {
        Mousetrap.bindGlobal(
            settings.keyboard.shortcut,
            keyboard.completion
        );
    }

    var isContentEditable = (window.document.body.contentEditable === 'true');
    if (
        settings.dialog.enabled &&
        // don't create the dialog inside editor iframes (eg. tinymce iframe)
        !isContentEditable
    ) {
        if (settings.qaBtn.enabled) {
            dialog.createQaBtn();
        }
        if (settings.dialog.limit) {
            dialog.RESULTS_LIMIT = settings.dialog.limit;
        }
        Mousetrap.bindGlobal(
            settings.dialog.shortcut,
            dialog.completion
        );

        // create dialog once and then reuse the same element
        dialog.create();
        dialog.bindKeyboardEvents(doc);
    }

    // temporary settings cache,
    // used by utils.parseTemplate
    App.settings.cache = Object.assign({}, settings);
};

window.App = App;

$(function() {
    if (document.contentType !== "text/html") {
        return; // don't load gorgias in non html pages (json, xml, etc..)
    }

    //console.log("Loaded Gorgias in", window.location.href);
    App.settings.fetchSettings(App.init, window.document);
});
