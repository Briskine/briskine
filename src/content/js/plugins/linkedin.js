/* Linkedin plugin
 */

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

    // message thread in Messaging interface
    const messagingUiThread = '.msg-thread';
    // thread in message bubble/dialog
    const bubbleMessageThread = '.msg-overlay-conversation-bubble__content-wrapper';
    // post in feed
    const feedPost = '.feed-shared-update-v2';
    // select any
    const messageThreadSelector = `${messagingUiThread}, ${bubbleMessageThread}, ${feedPost}`;

    // contact name in message threads
    const messageContactName = '.msg-s-event-listitem--other .msg-s-message-group__name';
    // contact name in feed post
    const feedContactName = '.feed-shared-actor__name';
    // select any
    const contactNameSelector = `${messageContactName}, ${feedContactName}`;

    const $thread = params.element.closest(messageThreadSelector);
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

    const parsedParams = Object.assign({
        text: parsedTemplate
    }, params);

    // Quill is used for posts and comments
    if (isQuill(params.element)) {
        // LinkedIn uses a customized Quill editor for posts.
        // Inserting text with newlines causes each block/line to be split into
        // multiple paragraph tags.
        // This causes our range object to change after we insert the text,
        // and places the focus at the start of the editor.
        // Since the inserted dom is changed, we place a special character
        // at the end of the template, so we can later find it and place focus there
        // (at the end of the inserted template).

        // zero-width whitespace
        const specialChar = '\u200b';
        // parsed template with special char
        const updatedTemplate = `${parsedTemplate}${specialChar}`;
        insertPlainText(
            Object.assign(
                {},
                parsedParams,
                {
                    text: updatedTemplate
                }
            )
        );

        // HACK
        // find the previously-placed special character in the editor contents.
        // wait for the LinkedIn editor to restructure the inserted template nodes.
        setTimeout(() => {
            const selection = window.getSelection();
            const anchorNode = selection.anchorNode;

            // if the anchorNode is the editor, try to find the node with the special char.
            // when the anchorNode is not the editor, we are inserting single-line templates,
            // which keep the focus at the correct spot.
            if (anchorNode === params.element) {
                const lastSpecialCharNode = Array.from(selection.anchorNode.children).reverse().find((node) => {
                    // trim textContent in case we add spaces after the template shortcut
                    const text = (node.textContent || '').trim();
                    const specialCharPosition = text.indexOf(specialChar);

                    // find the node where the special char is at the end
                    return (
                        specialCharPosition !== -1 &&
                        specialCharPosition === text.length - 1
                    );
                });

                // remove the special char from the node,
                // so we don't have issues later with finding the newest inserted one
                // (in case we insert multiple multi-line templates).
                lastSpecialCharNode.textContent = lastSpecialCharNode.textContent.replace(new RegExp(specialChar, 'g'), '');

                // set focus at the special char
                const range = document.getSelection().getRangeAt(0);
                range.selectNodeContents(lastSpecialCharNode);
                range.collapse();
            }
        });

        return true;
    }

    insertText(parsedParams);
    return true;
};
