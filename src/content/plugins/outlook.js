/* Outlook plugin
 */

import parseTemplate from '../utils/parse-template.js';
import {insertTemplate} from '../editors/editor-universal.js';
import createContact from '../utils/create-contact.js';
import {enableBubble} from '../bubble/bubble.js';

function getFieldData (field, $container) {
    var $buttons = $container.querySelectorAll('[class*="wellItemText-"]') || [];
    $buttons.forEach(function ($button) {
        // names are formatted as "name <email@email.com>"
        let email = '';
        const fullName = ($button.innerText || '').replace(new RegExp('<[^()]*>'), (match) => {
            email = match.slice(1, -1);
            return '';
        }).trim();

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
  // get the parent of each extra field input
  return Array.from(document.querySelectorAll('[role=main] input[autocapitalize=off]')).map((node) => {
    return node.parentElement
  })
}

function getToContainer () {
    return getContainers()[0];
}

function getCcContainer () {
    return getContainers()[1];
}

function getBccContainer () {
    return getContainers()[2];
}

// only 2 ms-Button--action (cc/bcc) in the message container
function getFieldButtonSelector () {
    return '[role=main] .ms-Button--command';
}

function getCcButton () {
    return document.querySelector(getFieldButtonSelector());
}

function getBccButton () {
    return Array.from(document.querySelectorAll(getFieldButtonSelector())).pop();
}

function getSuggestionContainer (email) {
  return function () {
    // "use this address" not in contact list
    var headerSelector = `.ms-Suggestions-headerContainer [class*="useAddressContainer-"]`;
    // contact list suggestion
    // only when the suggestion contains the email and the item is first (is selected)
    var listSelector = `.ms-Suggestions-container [aria-label*="${email}"][aria-selected=true][role=option]`;
    return document.querySelector(`${headerSelector}, ${listSelector}`);
  }
}

function getSubjectField () {
    return document.querySelector('.ms-TextField-field[maxlength="255"]');
}

function getContactField ($container) {
  return $container.querySelector('input');
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

function updateContactField ($field, value, $editor) {
  const splitValues = value.split(',')
  splitValues.forEach((v) => {
    const cleanValue = v.trim()
    return addSingleContact($field, cleanValue, $editor)
  })
}

var fieldUpdateQueue = Promise.resolve()
function addSingleContact ($field, value, $editor) {
  // wait for previous contact field update
  fieldUpdateQueue = fieldUpdateQueue.then(() => {
    $field.value = value
    $field.dispatchEvent(new Event('input', {bubbles: true}))

    return waitForElement(getSuggestionContainer(value)).then(() => {
      $field.dispatchEvent(
        new KeyboardEvent('keydown', {
          keyCode: 13,
          which: 13,
          bubbles: true
        })
      )

      // restore focus
      $editor.focus()

      return
    })
  })
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

    // BUG only works if "From" field is visible
    let fromEmail = '';
    // finds the From button, then the read-only from field after the button
    const $fromEmailButton = document.querySelector('[role=complementary] [aria-haspopup=menu] + * [aria-haspopup=dialog]');
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

function after (params, data) {
  var $subject = getSubjectField();
  if (params.quicktext.subject && $subject) {
    var parsedSubject = parseTemplate(params.quicktext.subject, data);
    $subject.value = parsedSubject;
    $subject.dispatchEvent(new Event('input', {bubbles: true}));
  }

  if (params.quicktext.to) {
    var $to = getToContainer();
    var parsedTo = parseTemplate(params.quicktext.to, data);
    if ($to && !elementContains($to, parsedTo)) {
      var $toInput = getContactField($to);
      updateContactField($toInput, parsedTo, params.element);
    }
  }

  if (params.quicktext.cc) {
    var $cc = getCcContainer();
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

  if (params.quicktext.bcc) {
    var $bcc = getBccContainer();
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
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    // trigger on specific meta tag,
    // to support custom domains.
    const $cdnMeta = document.querySelector('meta[name=cdnUrl]');
    if (
        $cdnMeta &&
        ($cdnMeta.getAttribute('content') || '').includes('.cdn.office.net')
    ) {
        activeCache = true;
    }

    return activeCache;
}

if (isActive()) {
    enableBubble();
}

export default (params = {}) => {
  if (!isActive()) {
    return false;
  }

  const data = getData(params);
  const parsedTemplate = parseTemplate(params.quicktext.body, data);

  insertTemplate(Object.assign({
    text: parsedTemplate
  }, params));

  after(params, data);

  return true;
};
