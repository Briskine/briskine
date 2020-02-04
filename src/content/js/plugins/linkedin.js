/* Linkedin plugin
 */

import $ from 'jquery';

import {parseTemplate, insertText} from '../utils';

function parseName (name) {
    name = name.trim();

    var first_name = '';
    var last_name = '';

    var firstSpace = name.indexOf(' ');

    if(firstSpace === -1) {
        firstSpace = name.length;
    }

    first_name = name.substring(0, firstSpace);
    last_name = name.substring(firstSpace + 1, name.length);

    return {
        first_name: first_name,
        last_name: last_name
    };
}

// get all required data from the dom
function getData () {
    var vars = {
        from: {},
        to: [],
        subject: ''
    };

    var fromName = '';
    var $fromContainer= $('.nav-item__profile-member-photo');
    if ($fromContainer.length) {
        fromName = $fromContainer.attr('alt');
    }
    if (!fromName) {
        fromName = '';
    }
    var from = {
        name: fromName,
        first_name: '',
        last_name: '',
        email: ""
    };

    var parsedName = parseName(fromName);
    from.first_name = parsedName.first_name;
    from.last_name = parsedName.last_name;
    vars.from = from;

    var $contact = $('.msg-entity-lockup__entity-title');
    if ($contact.length) {
        parsedName = parseName($contact.text());
        var to = {
            name: name,
            first_name: '',
            last_name: '',
            email: ''
        };

        to.first_name = parsedName.first_name;
        to.last_name = parsedName.last_name;
        vars.to.push(to);
    }

    return vars;
}

function before (params) {
    if(params.quicktext.subject) {
        var $subjectField = $('#subject-msgForm', window.parent.document);
        $subjectField.val(params.quicktext.subject);
    }
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var linkedinUrl = '.linkedin.com/';

    // trigger the extension based on url
    if (window.location.href.indexOf(linkedinUrl) !== -1) {
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

    before(params);

    insertText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
