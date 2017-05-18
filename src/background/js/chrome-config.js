// Register Chrome runtime protocols and context menus
if (chrome.runtime) {

    // TODO somehow get this values from the plugins

    // for tabs.query auto-reload
    var urlMatchPatterns = [
        '*://mail.google.com/*',
        '*://inbox.google.com/*',
        '*://*.mail.yahoo.com/*',
        '*://*.mail.live.com/*',
        '*://outlook.live.com/*',
        '*://*.linkedin.com/*',
        '*://*.facebook.com/*',
        '*://*.fastmail.com/*',
        '*://*.uservoice.com/*',
        '*://*.zendesk.com/*'
    ];

    // Called when the url of a tab changes.
    var updatedTab = function (tabId, changeInfo, tab) {

        // in development
        // also show for localhost
        if (ENV && ENV === 'development') {
            //urlMatchRegex.push(/^https?:\/\/localhost\/gmail/);
            urlMatchPatterns.push("*/localhost/*");
        }
        return false;
    };

    var angularInjector = function () {
        var injector = angular.element('html').injector();
        if (!injector) {
            angular.bootstrap('html', ['gApp']);
            return angular.element('html').injector();
        }
        return injector;
    };

    // Listen for any changes to the URL of any tab.
    chrome.tabs.onUpdated.addListener(updatedTab);

    chrome.browserAction.onClicked.addListener(function () {
        window.open(chrome.extension.getURL('/pages/options.html') + '#/list', 'Options');
    });

    if (typeof chrome.runtime.setUninstallURL === 'function') {
        chrome.runtime.setUninstallURL("https://gorgias.io/uninstall");
    }

    // Called after installation: https://developer.chrome.com/extensions/runtime.html#event-onInstalled
    chrome.runtime.onInstalled.addListener(function (details) {
        if (details.reason == "install") {
            amplitude.getInstance().logEvent("Installed Gorgias");
            angularInjector().get('SettingsService').reset();
        } else if (details.reason == "update") {
            amplitude.getInstance().logEvent("Updated Gorgias", {'version': details.previousVersion});

            angularInjector().get('SettingsService').get('hints').then(function (hints) {
                if (hints && hints.postInstall) {
                    hints.postInstall = false;
                    SettingsService.set('hints', hints);
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
                window.open(chrome.extension.getURL('/pages/options.html') + '#/list?id=new&body=' + body, 'Options');
            });
        });

        if (details.reason == "install") {
            chrome.tabs.create({url: "pages/frameless.html#/installed"});
        } else if (details.reason == "update") {
            // perform the necessary migrations
            angularInjector().get('MigrationService').migrate();
        }
    });


    if (!chrome.runtime.onMessage.hasListeners()) {
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            var injector = angularInjector();
            var settingsService = injector.get('SettingsService');
            if (request.request === 'stats') {
                if (request.key === 'words') {
                    var words = parseInt(request.val, 10);
                    settingsService.get("words").then(function (oldWords) {
                        settingsService.set("words", oldWords + words);
                    });
                }
                sendResponse(true);
            }
            // Open new template window
            if (request.request === 'new') {
                window.open(chrome.extension.getURL('/pages/options.html') + '#/list?id=new&src=qa-button', 'New Template');
            }
            if (request.request === 'launchGorgias') {
                window.open(chrome.extension.getURL('/pages/options.html') + '#/list');
            }
            if (request.request === 'track') {
                if (request.event === "Inserted template") {
                    injector.get('TemplateService').used(request.data.id);
                }
                amplitude.getInstance().logEvent(request.event, request.data);
            }
            if (request.request === 'suggestion') {
                injector.get('SuggestionService').suggest(request.data).then(function (res) {
                    sendResponse(res);
                });
            }
            if (request.request === 'suggestion-used') {
                injector.get('SuggestionService').stats(request.data).then(function (res) {
                    sendResponse(res);
                });
            }
            if (request.request === 'suggestion-enabled') {
                injector.get('SuggestionService').enabled(request.data).then(function (res) {
                    sendResponse(res);
                });
            }
            return true;
        });
    }
}
