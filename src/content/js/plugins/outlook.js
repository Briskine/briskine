/* globals KeyboardEvent */
/* Outlook plugin
 */

import {parseTemplate, insertText} from '../utils';
import {createContact} from '../utils/data-parse';

function getFieldData (field, $container) {
    var $buttons = $container.querySelectorAll('[class*="wellItemText-"]') || [];
    $buttons.forEach(function ($button) {
        // names are formatted as "name <email@email.com>"
        const labelParts = ($button.innerText || '').split(new RegExp('<|>')).filter((t) => !!t);
        const fullName = labelParts.slice().shift();
        const email = labelParts.slice().pop();
        field.push(
            createContact({
                name: fullName,
                email: email
            })
        );
    });
}

// selector for to/cc/bcc containers
function getContainers () {
    return document.querySelectorAll('._3-ZPO_m-zQ9bTiZDH0Wtjq');
}

function getToContainer () {
    return getContainers()[1];
}

function getCcContainer () {
    return getContainers()[2];
}

function getBccContainer () {
    return getContainers()[3];
}

// only 2 ms-Button--action (cc/bcc) in the message container
function getFieldButtonSelector () {
    return '.w9fmR2qvDpeMRg-Qi0UxM';
}

function getCcButton () {
    return document.querySelector(`${getFieldButtonSelector()}:first-of-type`);
}

function getBccButton () {
    return document.querySelector(`${getFieldButtonSelector()}:last-of-type`);
}

function getSuggestionContainer () {
    // "use this address" not in contact list
    var headerSelector = `.ms-Suggestions-headerContainer [class*="useAddressContainer-"]`;
    // contact list suggestion
    var listSelector = `.ms-Suggestions-container [role="listitem"]`;

    return document.querySelector(`${headerSelector}, ${listSelector}`);
}

function getSubjectField () {
    return document.querySelector('.ms-TextField-field[maxlength="255"]');
}

function getContactField ($container) {
    return $container.querySelector('[role="combobox"]');
}

function waitForElement (getNode) {
    return new Promise((resolve) => {
        var $element = getNode();
        if ($element) {
            return resolve($element);
        }

        var selectorObserver = new MutationObserver(function (records, observer) {
            $element = getNode();
            if ($element) {
                observer.disconnect();
                resolve($element);
            }
        });
        selectorObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

var fieldUpdateQueue = [];
function updateContactField ($field, value, $editor) {
    // wait for previous contact field update
    fieldUpdateQueue.push(
        Promise.all(fieldUpdateQueue).then(() => {
            $field.value = value;
            $field.dispatchEvent(new Event('input', {bubbles: true}));

            return waitForElement(getSuggestionContainer).then(function () {
                // BUG only works once per field
                $field.dispatchEvent(
                    new KeyboardEvent('keydown', {
                        keyCode: 13,
                        which: 13,
                        bubbles: true
                    })
                );

                // restore focus
                $editor.focus();
                return;
            });
        })
    );
}

function elementContains ($element, value) {
    return ($element.innerText || '').includes(value);
}

function updateSection ($container, $button, getNode, value, $editor) {
    if ($container) {
        if (elementContains($container, value)) {
            // email already added
            return;
        }

        var $input = getContactField($container);
        updateContactField($input, value, $editor);
    } else if ($button) {
        // click CC/BCC button
        $button.click();
        waitForElement(getNode).then(($container) => {
            updateSection($container, $button, getNode, value, $editor);
        });
    }
}

// get all required data from the dom
function getData () {
    var vars = {
        from: [],
        to: [],
        cc: [],
        bcc: [],
        subject: ''
    };

    const $from = document.querySelector('#O365_MainLink_Me > div > div:nth-child(1)');
    let fullName = '';
    if ($from) {
        fullName = $from.textContent;
    }

    let fromEmail = '';
    const $fromEmailButton = document.querySelector('[role=button] + [data-lpc-hover-target-id]');
    if ($fromEmailButton) {
        fromEmail = $fromEmailButton.innerText;
    }

    vars.from.push(
        createContact({
            name: fullName,
            email: fromEmail
        })
    );

    var $to = getToContainer();
    if ($to) {
        getFieldData(vars.to, $to);
    }

    var $cc = getCcContainer();
    if ($cc) {
        getFieldData(vars.cc, $cc);
    }

    var $bcc = getBccContainer();
    if ($bcc) {
        getFieldData(vars.bcc, $bcc);
    }

    const $subject = getSubjectField();
    if ($subject) {
        vars.subject = $subject.value;
    }

    return vars;
}

function before (params, data) {
    // don't do anything if we don't have any extra fields
    if (!params.quicktext.subject &&
        !params.quicktext.to &&
        !params.quicktext.cc &&
        !params.quicktext.bcc
    ) {
        return Promise.resolve(params);
    }

    var $subject = getSubjectField();
    if (params.quicktext.subject && $subject) {
        var parsedSubject = parseTemplate(params.quicktext.subject, data);
        $subject.value = parsedSubject;
        $subject.dispatchEvent(new Event('input', {bubbles: true}));
    }

    var $to = getToContainer();
    if (params.quicktext.to) {
        var parsedTo = parseTemplate(params.quicktext.to, data);
        if ($to && !elementContains($to, parsedTo)) {
            var $toInput = getContactField($to);
            updateContactField($toInput, parsedTo, params.element);
        }
    }

    var $cc = getCcContainer();
    if (params.quicktext.cc) {
        var parsedCc = parseTemplate(params.quicktext.cc, data);
        var $ccButton = getCcButton();
        updateSection(
            $cc,
            $ccButton,
            getCcContainer,
            parsedCc,
            params.element
        );
    }

    var $bcc = getBccContainer();
    if (params.quicktext.bcc) {
        var parsedBcc = parseTemplate(params.quicktext.bcc, data);
        var $bccButton = getBccButton();
        updateSection(
            $bcc,
            $bccButton,
            getBccContainer,
            parsedBcc,
            params.element
        );
    }

    // refresh editor reference
    return waitForElement(() => document.querySelector('[contenteditable]'))
        .then(($container) => {
            return Object.assign(params, {
                element: $container
            });
        });
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var outlookScript = '/owa.0.js';
    // trigger on loaded script,
    // to support custom domains.
    if (Array.from(document.scripts).some((script) => {
        return (script.src || '').includes(outlookScript);
    })) {
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

    return before(params, data).then((newParams) => {
        insertText(Object.assign({
            text: parsedTemplate
        }, newParams));

        return true;
    });
};
