/* Zendesk plugin
 */

import {parseTemplate} from '../utils';
import {isSlate, insertSlateText} from '../utils/editor-slate';
import {insertTemplate} from '../utils/editor-generic';
import {createContact} from '../utils/data-parse';

function getData (params) {
    let agentName = '';
    let subject = '';

    let toEmail = '';
    let toName = '';
    const $editorView = params.element.closest('#editor-view');
    // Agent Workspace enabled
    if ($editorView) {
        // get the agent name from the document title (eg. Full Name - Agent).
        agentName = document.title.substring(0, document.title.lastIndexOf('-'));

        const avatarSelector = '[data-garden-id="tags.avatar"]';
        const $avatar = $editorView.querySelector(avatarSelector);
        if ($avatar) {
            toEmail = $avatar.getAttribute('alt');
        }

        const $name = $editorView.querySelector(`${avatarSelector} + *`);
        if ($name) {
            toName = $name.innerText;
        }
    }

    const $ticketSection = params.element.closest('.ticket');
    // Agent Workspace disabled
    if ($ticketSection) {
        // get the variables from the ticket header
        const $sender = $ticketSection.querySelector('.sender');
        if ($sender) {
            // keep only text nodes from sender container.
            // to and from data do not have wrapper elements.
            const $senderText = Array.from($sender.childNodes).filter((node) => {
                return node.nodeType === document.TEXT_NODE && (node.textContent || '').trim();
            });

            // TO name
            if ($senderText[0]) {
                toName = $senderText[0].textContent;
            }

            // TO email
            const $email = $sender.querySelector('.email');
            if ($email) {
                toEmail = $email.textContent;
            }

            // FROM name
            // eg. via First Name
            if ($senderText[1]) {
                let cleanAgentName = ($senderText[1].textContent || '').split(' ');
                // remove "via" from agent name
                if (cleanAgentName[0] === 'via') {
                    cleanAgentName = cleanAgentName.slice(1);
                }

                agentName = cleanAgentName.join(' ');
            }
        }
    }

    const workspaceSubject = '[data-test-id="omni-header-subject"]';
    const defaultSubject = '[data-test-id="ticket-pane-subject"]';
    const $subjectField = document.querySelector(`${workspaceSubject}, ${defaultSubject}`);
    if ($subjectField) {
        subject = $subjectField.value;
    }


    return {
        from: createContact({name: agentName}),
        to: [createContact({name: toName, email: toEmail})],
        cc: [],
        bcc: [],
        subject: subject
    };
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var zendeskUrl = '.zendesk.com';
    // trigger the extension based on url
    if(window.location.hostname.indexOf(zendeskUrl) !== -1) {
        activeCache = true;
    }

    return activeCache;
}

export default (params = {}) => {
    if (!isActive()) {
        return false;
    }

    const data = getData(params);
    const parsedTemplate = parseTemplate(params.quicktext.body, data);
    const parsedParams = Object.assign({
        text: parsedTemplate
    }, params);

    if (isSlate(params.element)) {
        insertSlateText(parsedParams);
        return true;
    }

    insertTemplate(parsedParams);
    return true;
};
