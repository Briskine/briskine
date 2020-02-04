/*
 PubSub events
 */

import $ from 'jquery';

import PubSub from './patterns';
import dialog from './dialog';

PubSub.subscribe('focus', function (action, element) {
    if ($(element).hasClass('qt-dropdown-search')) {
        return; // ignore search input
    }
});

/*
 Events handling
 */

PubSub.subscribe('blur', function (e) {
    PubSub.publish('focus', 'off', e.relatedTarget);
});

PubSub.subscribe('scroll', function () {
    // if search is focused
    if(document.activeElement !== $(dialog.searchSelector).get(0)) {
        dialog.close();
    }
});
