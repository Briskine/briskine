/* globals ENV */
import Config from '../config';

function resetSettings () {
    return window.store.setSettings({
        key: 'settings'
    });
}

// Register Chrome runtime protocols and context menus
if (chrome.extension) {

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
    chrome.tabs.onUpdated.addListener(updatedTab);

    // Called after installation: https://developer.chrome.com/extensions/runtime.html#event-onInstalled
    chrome.runtime.onInstalled.addListener(function (details) {
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
        chrome.tabs.query({'url': urlMatchPatterns}, function (tabs) {
            for (var i in tabs) {
                chrome.tabs.reload(tabs[i].id, {});
            }
        });

        // Context menus
        chrome.contextMenus.create({
            "title": 'Save \'%s\' as a template',
            "contexts": ['editable', 'selection']
        });

        // rather than using the contextMenu onclick function, we attach
        // an event to the onClicked event.
        // this fixes issues with the onclick function not being triggered
        // or the new tab not being opened.
        chrome.contextMenus.onClicked.addListener(function (info, tab) {
            // get the HTML selection
            chrome.tabs.executeScript(tab.id, {
                code: "var getHtmlSelection = function() { var selection = window.getSelection(); if (selection && selection.rangeCount > 0) { range = selection.getRangeAt(0); var clonedSelection = range.cloneContents(); var div = document.createElement('div'); div.appendChild(clonedSelection); return div.innerHTML; } else { return ''; } }; getHtmlSelection();"
            }, function (selection) {
                var body = encodeURIComponent(selection[0]);
                window.open(`${Config.functionsUrl}/#/list?id=new&body=${body}`, Config.dashboardTarget);
            });
        });

        if (details.reason == "install") {
            window.open(`${Config.functionsUrl}/welcome`, 'gorgias-welcome');
        }
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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
            sendResponse(true);
        }
        // Open new template window
        if (request.request === 'new') {
            window.open(`${Config.functionsUrl}/#/list?id=new&src=qa-button`, Config.dashboardTarget);
        }
        if (request.request === 'launchGorgias') {
            window.open(`${Config.functionsUrl}/#/list`, Config.dashboardTarget);
        }
        if (request.request === 'track') {
            if (request.event === 'Inserted template') {
                window.store.updateTemplateStats(request.data.id);
            }
        }
        return true;
    });
}