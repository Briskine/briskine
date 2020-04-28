/* Linkedin plugin
 */

import $ from 'jquery';

import {parseTemplate, insertText} from '../utils';
import {isQuill} from '../utils/editors';
import {insertPlainText} from '../utils/plain-text';
import {parseFullName} from '../utils/parse-text';

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

    var parsedName = parseFullName(fromName);
    from.first_name = parsedName.first_name;
    from.last_name = parsedName.last_name;
    vars.from = from;

    var $contact = $('.msg-entity-lockup__entity-title');
    if ($contact.length) {
        parsedName = parseFullName($contact.text());
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

    const parsedParams = Object.assign({
        text: parsedTemplate
    }, params);

    // Quill is used for posts and comments
    if (isQuill(params.element)) {
        // BUG
        // inserting a template with newlines causes the focus
        // to be set at the start of the editor.
        // we need to remove all newlines before inserting the template.
        const newlineChar = ' ';
        const strippedTemplate = parsedTemplate.replace(/\n/g, newlineChar);
        insertPlainText(
            Object.assign(
                {},
                parsedParams,
                {
                    text: strippedTemplate,
                    newline: newlineChar
                }
            )
        );
        return true;
    }

    insertText(parsedParams);

    return true;
};
