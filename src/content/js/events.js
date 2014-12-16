/*
 PubSub events
 */

PubSub.subscribe('focus', function (action, element) {
    if ($(element).hasClass('qt-dropdown-search')) {
        return; // ignore search input
    }
});

/*
 Events handling
 */

/*
App.onFocus = function (e) {
    var target = e.target;

    // Disable any focus as there may be only one focus on a page
    // PubSub.publish('focus', 'off', target);

    PubSub.publish('focus', 'on', target);
};
*/

App.onBlur = function (e) {
    PubSub.publish('focus', 'off', e.relatedTarget);
};

App.onScroll = function (e) {
    // if search is focused
    if(document.activeElement !== $(App.autocomplete.dialog.searchSelector).get(0)) {
        App.autocomplete.dialog.close();
    }
};
