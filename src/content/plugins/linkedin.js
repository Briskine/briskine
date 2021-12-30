/* globals DataTransfer, ClipboardEvent */
/* Linkedin plugin
 */

import {parseTemplate} from '../utils.js';
import {isQuill} from '../utils/editor-quill.js';
import {insertTemplate} from '../utils/editor-generic.js';
import {htmlToText} from '../utils/plain-text.js';
import {createContact} from '../utils/data-parse.js';
import {enableBubble} from '../bubble.js';

function before (params, data) {
    const $parent = params.element.closest('.msg-overlay-conversation-bubble');

    if ($parent) {
        // set subject field value.
        // subject is only available for inMail messaging.
        const $subjectField = $parent.querySelector('[name=subject]');
        if (params.quicktext.subject && $subjectField) {
            const parsedSubject = parseTemplate(params.quicktext.subject, data);
            $subjectField.value = parsedSubject;
        }
    }
}

// get all required data from the dom
function getData (params) {
    var vars = {
        from: {},
        to: [],
        subject: ''
    };

    let fromName = '';
    // global profile
    const $fromContainer = document.querySelector('.global-nav__me-photo');
    if ($fromContainer && $fromContainer.getAttribute('alt')) {
        fromName = $fromContainer.getAttribute('alt');
    }

    // Sales Navigator global profile
    const $salesFromContainer = document.querySelector('[data-control-name="view_user_menu_from_app_header"]');
    if ($salesFromContainer) {
        fromName = $salesFromContainer.innerText;
    }

    vars.from = createContact({name: fromName});

    let toName = '';
    // get the to field from the current viewed profile by default
    // eg. for the connect > add note field.
    const $currentProfilePicture = document.querySelector('.pv-top-card-profile-picture__image');
    if ($currentProfilePicture && $currentProfilePicture.hasAttribute('alt')) {
        toName = $currentProfilePicture.getAttribute('alt');
    }

    // Sales Navigator Connect
    const $salesToName = params.element.parentNode.querySelector('.artdeco-entity-lockup__title');
    if ($salesToName) {
        toName = $salesToName.innerText;
    }

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
    // contact name is new message
    const newMessageContact = '.artdeco-pill';
    // contact name in feed post
    const feedContactName = '.feed-shared-actor__name';
    // select any
    const contactNameSelector = `${messageContactName}, ${feedContactName}, ${newMessageContact}`;

    const $thread = params.element.closest(messageThreadSelector);
    // check if a message thread is visible,
    // otherwise we're in a non-messaging textfield.
    if ($thread) {
        // get the contacts from the thread, that is not ours
        const $contacts = $thread.querySelectorAll(contactNameSelector);
        if ($contacts.length) {
            // get the current messaging contact
            const $contact = $contacts.item($contacts.length - 1);
            toName = $contact.innerText;
        }
    }

    // Sales Navigator message thread
    const $salesConversation = document.querySelector('.conversation-insights');
    if ($salesConversation) {
        const $salesName = $salesConversation.querySelector('.artdeco-entity-lockup__title span:first-child');
        toName = $salesName.innerText;
    }

    vars.to.push(createContact({name: toName}));

    return vars;
}

// zero-width whitespace
// required for multi-line templates in posts/comments/quill
const specialChar = '\u200b';

function focusSpecialCharacter(editorNode) {
    const lastSpecialCharNode = Array.from(editorNode.children).reverse().find((node) => {
        // trim textContent in case we add spaces after the template shortcut
        const text = (node.textContent || '').trim();
        const specialCharPosition = text.indexOf(specialChar);

        // find the node where the special char is at the end
        return (
            specialCharPosition !== -1 &&
            specialCharPosition === text.length - 1
        );
    });

    // node should always be available,
    // but in case we don't find it.
    if (lastSpecialCharNode) {
        // remove the special char from the node,
        // so we don't have issues later with finding the newest inserted one
        // (in case we insert multiple multi-line templates).
        lastSpecialCharNode.textContent = lastSpecialCharNode.textContent.replace(new RegExp(specialChar, 'g'), '');

        // place the focus at the node with the special character
        const range = document.createRange();
        range.selectNodeContents(lastSpecialCharNode);
        range.collapse();

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
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

function isMessageEditor (element) {
    return (
        element &&
        element.getAttribute('contenteditable') === 'true' &&
        element.getAttribute('role') === 'textbox'
    );
}

function setup () {
    if (!isActive()) {
        return;
    }

    enableBubble();

    // Fix interaction with our dialog in LinkedIn modals.
    // LinkedIn uses a focusout event on the body, that restores focus
    // when modals (Create a Post, Add a Note after Connect) are open.
    // These modals contain editors where you can open the dialog (with bubble or shortcut).
    // Because our dialog is created outside the body, the focusout handler
    // stops any sort of interaction with our dialog (focus, scroll, keyboard navigation).
    // Prevent the LinkedIn event handler from being run, when interacting with our dialog.
    const dialogSelector = '.qt-dropdown';
    window.addEventListener('focusout', (e) => {
        if (e.relatedTarget && e.relatedTarget.closest(dialogSelector)) {
            e.stopImmediatePropagation();
        }
    }, true);

    // custom linkedin styles
    const css = `
        <style>
            /* the message form has a caret icon on the right side.
             * position the bubble on the left side of the icon.
             * the separate inMail message form does not have the caret icon.
             */
            .msg-form:not(.full-height) b-bubble {
                margin-right: 3em;
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', css);
}

setup();

export default (params = {}) => {
    if (!isActive()) {
        return false;
    }

    var data = getData(params);
    // insert only plain text on linkedin
    var parsedTemplate = htmlToText(parseTemplate(params.quicktext.body, data));

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

        // parsed template with special char
        const updatedTemplate = `${parsedTemplate}${specialChar}`;
        insertTemplate(
            Object.assign(
                {},
                parsedParams,
                {
                    text: updatedTemplate
                }
            )
        );

        // wait for the LinkedIn editor to restructure the inserted template nodes.
        const editorUpdate = new MutationObserver((mutationsList, observer) => {
            // find the previously-placed special character in the editor contents.
            focusSpecialCharacter(params.element);
            observer.disconnect();
        });
        editorUpdate.observe(params.element, {childList: true, subtree: true});

        return true;
    }

    // messaging, ember editor.
    // separate handling required for multi-line templates.
    if (isMessageEditor(params.element)) {
        before(parsedParams, data);
        insertTemplate(parsedParams);

        // sends an empty paste event so the editor restructures the dom
        // making it aware of the newlines.
        // otherwise, when we press Enter, multi line templates will be
        // compressed to one line.
        try {
            const clipboardData = new DataTransfer();
            // zero-width no-break space
            // required for multi-line templates.
            // using the regular zero-width space causes links to include it in urls.
            const zeroWidthNoBrakeSpace = '\ufeff';
            clipboardData.setData('text/plain', zeroWidthNoBrakeSpace);
            const customPasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                clipboardData: clipboardData
            });
            params.element.dispatchEvent(customPasteEvent);
        } catch (err) {
            // will throw an error on Safari
            // because it doesn't support the DataTransfer constructor
            // or passing custom clipboard data in the Event constructor,
            // required for clipboardData.
            // Adding a fake clipboardData property to an existing event
            // also doesn't work, because it strips the entire object
            // by the time it reaches the event handler.
            // Until it supports the DataTransfer constructor,
            // multi-line templates will be inserted as one liners,
            // in LinkedIn messaging on Safari.
        }

        return true;
    }

    // generic editor, including textareas
    insertTemplate(parsedParams);
    return true;
};
