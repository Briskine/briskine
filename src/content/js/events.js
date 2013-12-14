/*
   PubSub events
*/

PubSub.subscribe('focus', function(action, element, gmailView) {
    if (action === 'on') {
        App.data.inCompose = true;
        App.data.composeElement = element;
        App.data.gmailView = gmailView;
    } else if (action === 'off') {
        if (App.data.composeElement !== element) {
            App.data.inCompose = false;
            App.data.composeElement = null;
            App.data.gmailView = '';
        }
    }
});

/*
    Events handling
*/

App.onFocus = function(e) {
    var target = e.target;

    // Disable any focus as there may be only one focus on a page
    // PubSub.publish('focus', 'off', target);

    // TODO: some refactoring here
    // Check if it is the compose element
    if (target.type === 'textarea' && target.getAttribute('name') === 'body') {
        PubSub.publish('focus', 'on', target, 'basic html');
    } else if (target.classList.contains('editable') && target.getAttribute('contenteditable')) {
        PubSub.publish('focus', 'on', target, 'standard');
    }
};

App.onBlur = function(e) {
    PubSub.publish('focus', 'off', e.target);
};

App.onKeyDown = function(e) {
    App.autocomplete.onKeyDown(e);
};

App.onKeyUp = function(e) {
    App.autocomplete.onKeyUp(e);
};

// wait for the background page to send a message to the content script
chrome.runtime.onMessage.addListener(
function(request, sender, sendResponse) {
    // insert quicktext
    if (request.action && request.action == 'insert'){
        if (App.data.inCompose){
            var quicktext = request.quicktext;
            var dest = document.getSelection();
            var e = {
                target: dest.baseNode
            };

            // return focus to it's rightful owner
            App.onFocus(e);
            App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(e);
            App.autocomplete.cursorPosition.word = "";
            App.autocomplete.replaceWith(quicktext);
        }
    }
    sendResponse();
});
