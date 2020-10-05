/* globals ENV */
import Config from '../config';
import browser from 'webextension-polyfill';

function resetSettings () {
    return window.store.setSettings({
        key: 'settings'
    });
}

// for tabs.query auto-reload
var urlMatchPatterns = [
    '*://mail.google.com/*',
    '*://inbox.google.com/*',
    '*://*.mail.yahoo.com/*',
    '*://*.mail.live.com/*',
    '*://outlook.live.com/*',
    '*://*.linkedin.com/*',
    '*://*.facebook.com/*',
    '*://*.messenger.com/*',
    '*://*.fastmail.com/*',
    '*://*.uservoice.com/*',
    '*://*.zendesk.com/*'
];

// Called when the url of a tab changes.
var updatedTab = function () {
    // in development
    // also show for localhost
    var localhostPattern = "*://localhost/*";

    if (ENV && ENV === 'development' && urlMatchPatterns.indexOf(localhostPattern) === -1) {
        urlMatchPatterns.push(localhostPattern);
    }
    return false;
};

// Listen for any changes to the URL of any tab.
browser.tabs.onUpdated.addListener(updatedTab);

// Called after installation
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
browser.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install") {
        // reset settings
        resetSettings();
    } else if (details.reason == "update") {
        window.store.getSettings({
            key: 'hints'
        }).then((hints) => {
            if (hints && hints.postInstall) {
                hints.postInstall = false;
                window.store.setSettings({
                    key: 'hints',
                    val: hints
                });
            }
        });
    }

    // All affected tabs should be reloaded if the extension was installed
    browser.tabs.query({'url': urlMatchPatterns}).then(function (tabs) {
        for (var i in tabs) {
            browser.tabs.reload(tabs[i].id, {});
        }
    });

    // Context menus
    browser.contextMenus.create({
        "title": 'Save \'%s\' as a template',
        "contexts": ['editable', 'selection']
    });

    // rather than using the contextMenu onclick function, we attach
    // an event to the onClicked event.
    // this fixes issues with the onclick function not being triggered
    // or the new tab not being opened.
    browser.contextMenus.onClicked.addListener(function (info, tab) {
        // get the HTML selection
        browser.tabs.executeScript(tab.id, {
            code: "var getHtmlSelection = function() { var selection = window.getSelection(); if (selection && selection.rangeCount > 0) { range = selection.getRangeAt(0); var clonedSelection = range.cloneContents(); var div = document.createElement('div'); div.appendChild(clonedSelection); return div.innerHTML; } else { return ''; } }; getHtmlSelection();"
        }).then(function (selection) {
            var body = encodeURIComponent(selection[0]);
            browser.tabs.create({
                url: `${Config.functionsUrl}/#/list?id=new&body=${body}`
            });
        });
    });

    if (details.reason == "install") {
        browser.tabs.create({
            url: `${Config.functionsUrl}/welcome`
        });
    }
});

browser.runtime.onMessage.addListener(function (request) {
    if (request.request === 'stats') {
        if (request.key === 'words') {
            var words = parseInt(request.val, 10);
            window.store.getSettings({
                key: 'words'
            }).then(function (oldWords) {
                window.store.setSettings({
                    key: 'words',
                    val: oldWords + words
                });
            });
        }

        return true;
    }
    // Open new template window
    if (request.request === 'new') {
        browser.tabs.create({
            url: `${Config.functionsUrl}/#/list?id=new&src=qa-button`
        });
    }
    if (request.request === 'track') {
        if (request.event === 'Inserted template') {
            window.store.updateTemplateStats(request.data.id);
        }
    }
    return true;
});
