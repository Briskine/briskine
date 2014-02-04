// Register Chrome runtime protocols and context menus
if (chrome.runtime) {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (!document.querySelector('body[class=ng-scope]')) {
            angular.bootstrap('body', ['gqApp']);
        }
        var injector = angular.element('body').injector();
        if (request.request === 'get') {
            injector.get('QuicktextService').quicktexts().then(function (res) {
                sendResponse(res);
                _gaq.push(['_trackEvent', "content", 'insert']);
            });
        }
        var settingsService = injector.get('SettingsService');
        if (request.request === 'stats') {
            if (request.key === 'words') {
                var words = parseInt(request.val, 10);
                settingsService.set("words", settingsService.get("words") + words);
            }
            sendResponse(true);
        }
        if (request.request === 'getAutocompleteEnabled') {
            sendResponse(settingsService.get("autocompleteEnabled"));
        }
        if (request.request === 'getAutocompleteDelay') {
            sendResponse(settingsService.get("autocompleteDelay"));
        }

        return true;
    });

    // Context menus
    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
        "title": 'Save as Quicktext',
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

    // Called when the url of a tab changes.
    var checkForValidUrl = function (tabId, changeInfo, tab) {
        if (ENV && ENV === 'development') {
            // Display in gmail and localhost
            if (/^https?:\/\/mail.google.com/.test(tab.url) || /^https?:\/\/localhost\/gmail/.test(tab.url)) {
                chrome.pageAction.show(tabId);
            }
        } else {
            // Display only in gmail
            if (/^https?:\/\/mail.google.com/.test(tab.url)) {
                chrome.pageAction.show(tabId);
            }
        }
    };

    // Listen for any changes to the URL of any tab.
    chrome.tabs.onUpdated.addListener(checkForValidUrl);

    // Called after installation: https://developer.chrome.com/extensions/runtime.html#event-onInstalled
    chrome.runtime.onInstalled.addListener(function (details) {
        _gaq.push(['_trackEvent', "general", 'installed-quicktext']);

        // perform the necessary migrations
        if (!document.querySelector('body[class=ng-scope]')) {
            angular.bootstrap('body', ['gqApp']);
        }

        var injector = angular.element('body').injector();
        injector.get('QuicktextService').migrate_043_100();

        // All gmail tabs shoul be reloaded if the extension was installed
        chrome.tabs.query({'url': '*://mail.google.com/*'}, function (tabs) {
            for (var i in tabs) {
                chrome.tabs.reload(tabs[i].id, {});
            }
        });
    });
}
