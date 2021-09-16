/*
 This is the index file which is loaded first after patterns
 All declarations are done here
 */

import '../css/content.css';
// native custom elements are not supported in content scripts
// https://bugs.chromium.org/p/chromium/issues/detail?id=390807
import '@webcomponents/custom-elements';
import $ from 'jquery';
// creates global window.Mousetrap
import Mousetrap from 'mousetrap';
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import './helpers/content-helpers';
import './events';

import store from '../../store/store-client';
import keyboard from './keyboard';
import dialog from './dialog';
import PubSub from './patterns';

import {setup as setupBubble} from './bubble';

var App = {
    // TODO move settings to module
    settings: {
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
    // TODO check utils.insertTemplate
//     App.settings.editor_enabled = settings.editor.enabled;

    var blacklistPrivate = [];

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

    doc.addEventListener("blur", (e) => {
        PubSub.publish('blur', e);
    }, true);
    doc.addEventListener("scroll", (e) => {
        PubSub.publish('scroll', e);
    }, true);

    // use custom keyboard shortcuts
    if (settings.expand_enabled) {
        Mousetrap.bindGlobal(
            settings.expand_shortcut,
            keyboard.completion
        );
    }

    var isContentEditable = (window.document.body.contentEditable === 'true');
    if (
        settings.dialog_enabled &&
        // don't create the dialog inside editor iframes (eg. tinymce iframe)
        !isContentEditable
    ) {
        setupBubble();
        if (settings.dialog_limit) {
            dialog.RESULTS_LIMIT = settings.dialog_limit;
        }
        Mousetrap.bindGlobal(
            settings.dialog_shortcut,
            dialog.completion
        );

        // create dialog once and then reuse the same element
        dialog.create();
        dialog.bindKeyboardEvents(doc);
    }

    // temporary settings cache,
    // used by utils.parseTemplate
    // TODO replace
    App.settings.cache = Object.assign({}, settings);
};

window.App = App;

$(function() {
    if (document.contentType !== 'text/html') {
      // don't load on non html pages (json, xml, etc..)
      return
    }

    store.getSettings().then((settings) => {
      App.init(settings, window.document)
    })
});
