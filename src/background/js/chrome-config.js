// Register Chrome runtime protocols and context menus
if(chrome.runtime){
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.request == 'get'){
            if (!document.querySelector('body[class=ng-scope]')) {
                angular.bootstrap('body', ['gqApp']);
            }
            var injector = angular.element('body').injector();
            injector.get('QuicktextService').quicktexts().then(function(res){
                sendResponse(res);
            });
        }
        return true;
    });

    // Context menus
    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
        "title": 'Save as Quicktext',
        "contexts": ['editable', 'selection'],
        "onclick": function(info, tab){
            // I would have loved to open the popup.html with this, but at this moment
            // it's not possible to do so due to browser restrictions of Chrome
            // so we are going to open a dialog with the form
            returnVal = window.showModalDialog('/pages/bg.html#dialog',
                {'selection': info.selectionText, 'show': 'form'},
                "dialogwidth: 900; dialogheight: 375; resizable: yes");
        }
    });

    // Called when the url of a tab changes.
    function checkForValidUrl(tabId, changeInfo, tab) {
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
    }

    // Listen for any changes to the URL of any tab.
    chrome.tabs.onUpdated.addListener(checkForValidUrl);
}
