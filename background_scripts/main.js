var onMessage = chrome.runtime.onMessage || chrome.extension.onMessage;
onMessage.addListener(function(request, sender, sendResponse) {
    if (request.request == 'get'){
        sendResponse(Settings.get(request.data));
    }
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
        returnVal = window.showModalDialog('/pages/dialog.html',
            {'selection': info.selectionText, 'show': 'form'},
            "dialogwidth: 900; dialogheight: 375; resizable: yes");
    }
});
