/* Linkedin plugin
 */

import $ from 'jquery';

import {parseTemplate, insertText} from '../utils';
import {isQuill} from '../utils/editors';
import {insertPlainText} from '../utils/plain-text';
import {parseFullName} from '../utils/parse-text';

// get all required data from the dom
function getData (params) {
    var vars = {
        from: {},
        to: [],
        subject: ''
    };

    let fromName = '';
    const $fromContainer = document.querySelector('.global-nav__me-photo');
    if ($fromContainer) {
        fromName = $fromContainer.getAttribute('alt');
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

    // get message thread based on the focus textarea.
    // needs different selectors for Messaging interface and chat bubble.
    const messagingUiThread = '.msg-thread';
    const bubbleMessageThread = '.msg-overlay-conversation-bubble__content-wrapper';
    const contactNameSelector = '.msg-s-event-listitem--other .msg-s-message-group__name';
    const $thread = params.element.closest(`${messagingUiThread}, ${bubbleMessageThread}`);
    // check if a message thread is visible,
    // otherwise we're in a non-messaging textfield.
    if ($thread) {
        // get the contacts from the thread, that is not ours
        const $contacts = $thread.querySelectorAll(contactNameSelector);
        if ($contacts.length) {
            // get the last contact
            const $contact = $contacts.item($contacts.length - 1);
            parsedName = parseFullName($contact.innerText);
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
