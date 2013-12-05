var onMessage = chrome.runtime.onMessage || chrome.extension.onMessage;

// wait for the background page to send a message to the content script
onMessage.addListener(
function(request, sender, sendResponse) {
    // insert quicktext
    if (request.action && request.action == 'insert'){
        var quicktext = request.quicktext;

        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition();
        App.autocomplete.cursorPosition.word = "";
        App.autocomplete.replaceWith(quicktext);
    }
});
