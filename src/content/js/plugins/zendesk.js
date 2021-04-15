/* Zendesk plugin
 */

import {parseTemplate} from '../utils';
import {isSlate, insertSlateText} from '../utils/editor-slate';
import {insertTemplate} from '../utils/editor-generic';
import {createContact} from '../utils/data-parse';

function getData (params) {
    // get the agent name from the document title (eg. Full Name - Agent).
    const agentName = document.title.substring(0, document.title.lastIndexOf('-'));

    let toEmail = '';
    let toName = '';
    const $editorView = params.element.closest('#editor-view');
    if ($editorView) {
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


    let subject = '';
    const $subjectField = document.querySelector('[data-test-id="omni-header-subject"]');
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
