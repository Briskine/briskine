// Register Chrome runtime protocols and context menus
if (chrome.runtime) {

    // TODO somehow get this values from the plugins

    // for tabs.query auto-reload
    var urlMatchPatterns = [
        '*://mail.google.com/*',
        '*://*.mail.yahoo.com/*',
        '*://*.mail.live.com/*',
        '*://*.linkedin.com/*',
        '*://*.facebook.com/*',
        '*://*.fastmail.com/*'
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
        if (!document.querySelector('html[class=ng-scope]')) {
            angular.bootstrap('html', ['gApp']);
        }
        return angular.element('html').injector();
    };

    // Listen for any changes to the URL of any tab.
    chrome.tabs.onUpdated.addListener(updatedTab);

    // Called after installation: https://developer.chrome.com/extensions/runtime.html#event-onInstalled
    chrome.runtime.onInstalled.addListener(function (details) {
        if (details.reason == "install") {
            mixpanel.track("Installed Gorgias");
        } else if (details.reason == "update") {
            mixpanel.track("Updated Gorgias", {'version': details.previousVersion});
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
            var quicktextBody = encodeURIComponent(info.selectionText);
            window.open(chrome.extension.getURL('/pages/bg.html') + '#/list?id=new&body=' + quicktextBody, 'quicktextOptions');

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
            if (request.request === 'get') {
                injector.get('TemplateService').quicktexts().then(function (res) {
                    if (res.length) {
                        mixpanel.track("Inserted template", {
                            "title_size": res[0].title.length,
                            "body_size": res[0].body.length,
                            "source": "message"
                        });
                    }
                    sendResponse(res);
                });
            }

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
            if (request.request === 'settings') {
                settingsService.get("settings").then(function (settings) {
                    sendResponse(settings);
                });
            }
            if (request.request === 'insert') {
                mixpanel.track("Inserted template", {
                    "source": "keyboard",
                    "title_size": request.template.title.length,
                    "body_size": request.template.body.length
                });
                sendResponse(true);
            }
            if (request.request === 'search') {
                mixpanel.track("Searched template", {
                    'query_size': request.query_size
                });
                sendResponse(true);
            }
            return true;
        });
    }
}
