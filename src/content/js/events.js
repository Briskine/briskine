/*
 PubSub events
 */

PubSub.subscribe('focus', function (action, element, gmailView) {
    if (action === 'on') {
        App.data.inCompose = true;
        App.data.composeElement = element;
        App.data.gmailView = gmailView;
    } else if (action === 'off' && element !== null) {
        App.data.inCompose = false;
        App.data.composeElement = null;
        App.data.gmailView = '';
    }
});

/*
 Events handling
 */

App.onFocus = function (e) {
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

App.onBlur = function (e) {
    PubSub.publish('focus', 'off', e.relatedTarget);
};

App.onKeyDown = function (e) {
    App.autocomplete.onKeyDown(e);
};

App.onKeyUp = function (e) {
    App.autocomplete.onKeyUp(e);
};

App.onScroll = function (e) {
    App.autocomplete.close();
};
