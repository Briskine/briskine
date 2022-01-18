/* Facebook plugin
 */

import {parseTemplate} from '../utils.js';
import {insertLexicalText} from '../utils/editor-lexical.js';

var parseName = function(name) {
    name = name.trim();

    var firstSpace = name.indexOf(' ');

    if(firstSpace === -1) {
        firstSpace = name.length;
    }

    var first_name = name.substring(0, firstSpace);
    var last_name = name.substring(firstSpace + 1, name.length);

    return {
        first_name: first_name,
        last_name: last_name
    };
};

var fromDetails = [];
var getFromDetails = function () {
    if (!fromDetails.length) {
        var objectMatch = new RegExp('{"USER_ID":.+?}');
        var plainUserObject = '';
        // get full name from inline script
        Array.from(document.scripts).some((script) => {
            var match = (script.textContent || '').match(objectMatch);
            if (!script.src && match) {
                plainUserObject = match[0] || '';
                return true;
            }
        });

        var fromName = '';
        try {
            var parsedUserObject = JSON.parse(plainUserObject);
            fromName = parsedUserObject.NAME || '';
        } catch(err) {}

        fromDetails = [
            Object.assign({
                name: fromName,
                first_name: '',
                last_name: '',
                email: ''
            }, parseName(fromName))
        ];
    }

    return fromDetails;
};

var getToDetails = function () {
    var singleToContainer = '._1jt6';
    // single recipient.
    // link on messenger.com,
    // hovercard on facebook.com.
    var $to = document.querySelector(`
        ${singleToContainer} a[href*="//www.facebook.com/"],
        ${singleToContainer} a[data-hovercard]
    `);
    if ($to) {
        var singleToName = ($to.innerText || '').trim();
        return [
            Object.assign({
                name: singleToName,
                first_name: '',
                last_name: '',
                email: ''
            }, parseName(singleToName))
        ];
    }

    // group
    var $recipients = document.querySelectorAll('._364g');
    if ($recipients.length) {
        return Array.from($recipients).map(($person) => {
            var toName = ($person.innerText || '').trim();
            return Object.assign({
                name: toName,
                first_name: '',
                last_name: '',
                email: ''
            }, parseName(toName));
        });
    }

    return [];
};

// get all required data from the dom
function getData () {
    return {
        from: getFromDetails(),
        to: getToDetails()
    };
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var facebookUrl = '.facebook.com/';
    var messengerUrl = '.messenger.com/';

    // trigger the extension based on url
    if (
        window.location.href.indexOf(facebookUrl) !== -1 ||
        window.location.href.indexOf(messengerUrl) !== -1
    ) {
        activeCache = true;
    }

    return activeCache;
}

export default (params = {}) => {
    if (!isActive()) {
        return false;
    }

    var data = getData(params);
    var parsedTemplate = parseTemplate(params.quicktext.body, data);

    insertLexicalText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
