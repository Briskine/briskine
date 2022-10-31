/* Outlook plugin
 */

import parseTemplate from '../utils/parse-template.js';
import {insertTemplate} from '../editors/editor-universal.js';
import createContact from '../utils/create-contact.js';
import {enableBubble} from '../bubble/bubble.js';

function getFieldData (field, $container) {
  var $buttons = $container.querySelectorAll('[draggable="true"]') || [];
  $buttons.forEach(function ($button) {
    // we can no longer get recepient emails,
    // as they're not included in the dom anymore.
    const email = ''
    let fullName = ''
    const $fullNameContainer = $button.querySelector('span > span > span > span')
    if ($fullNameContainer) {
      fullName = $fullNameContainer.innerText
    }

    field.push(
      createContact({
        name: fullName,
        email: email
      })
    )
  })
}

// selector for to/cc/bcc containers
function getContainers () {
  // get the parent of each extra field input
  return Array.from(document.querySelectorAll('[role=main] [role=textbox]')).map((node) => {
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
    const headerSelector = `.ms-Suggestions-footerContainer [role=listitem] .ms-Suggestions-sectionButton`
    // contact list suggestion
    // only when the suggestion contains the email and the item is first (is selected)
    const listSelector = `.ms-Suggestions-container [aria-label*="${email}"][role=listitem]`
    return document.querySelector(`${headerSelector}, ${listSelector}`)
  }
}

function getSubjectField () {
    return document.querySelector('.ms-TextField-field[maxlength="255"]');
}

function getContactField ($container) {
  return waitForElement(() => {
    return $container.querySelector('[contenteditable]')
  })
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
                setTimeout(() => {
                  resolve($element)
                })
            }
        });
        selectorObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function updateContactField ($field, value) {
  const splitValues = value.split(',')
  splitValues.forEach((v) => {
    const cleanValue = v.trim()
    if (elementContains($field, cleanValue)) {
      // value already added
      return
    }

    return addSingleContact($field, cleanValue)
  })
}

var fieldUpdateQueue = Promise.resolve()
function addSingleContact ($field, value) {
  // wait for previous contact field update
  fieldUpdateQueue = fieldUpdateQueue.then(() => {
    // cache selection details, to restore later
    const selection = window.getSelection()
    const focusNode = selection.focusNode
    const focusOffset = selection.focusOffset
    const anchorNode = selection.anchorNode
    const anchorOffset = selection.anchorOffset

    $field.focus()
    const range = window.getSelection().getRangeAt(0)
    const templateNode = range.createContextualFragment(value)
    range.insertNode(templateNode)
    range.collapse()
    $field.dispatchEvent(new Event('input', {bubbles: true}))

    return waitForElement(getSuggestionContainer(value)).then(() => {
      $field.dispatchEvent(
        new KeyboardEvent('keydown', {
          keyCode: 13,
          which: 13,
          key: 'Enter',
          code: 'Enter',
          bubbles: true
        })
      )

      return new Promise((resolve) => {
        // give it a second to render the selected item
        setTimeout(() => {
          // restore focus
          window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
          resolve()
        })
      })
    })
  })
}

function elementContains ($element, value) {
    return ($element.innerText || '').includes(value);
}

async function updateSection ($container, $button, getNode, value) {
    if ($container) {
        var $input = await getContactField($container);
        updateContactField($input, value);
    } else if ($button) {
        // click CC/BCC button
        $button.click();
        waitForElement(getNode).then(($container) => {
            updateSection($container, $button, getNode, value)
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

async function after (params, data) {
  var $subject = getSubjectField();
  if (params.quicktext.subject && $subject) {
    var parsedSubject = await parseTemplate(params.quicktext.subject, data);
    $subject.value = parsedSubject;
    $subject.dispatchEvent(new Event('input', {bubbles: true}));
  }

  if (params.quicktext.to) {
    var $to = getToContainer();
    var parsedTo = await parseTemplate(params.quicktext.to, data);
    if ($to && !elementContains($to, parsedTo)) {
      var $toInput = await getContactField($to);
      updateContactField($toInput, parsedTo);
    }
  }

  if (params.quicktext.cc) {
    var $cc = getCcContainer();
    var parsedCc = await parseTemplate(params.quicktext.cc, data);
    var $ccButton = getCcButton();
    updateSection(
      $cc,
      $ccButton,
      getCcContainer,
      parsedCc,
    );
  }

  if (params.quicktext.bcc) {
    var $bcc = getBccContainer();
    var parsedBcc = await parseTemplate(params.quicktext.bcc, data);
    var $bccButton = getBccButton();
    updateSection(
      $bcc,
      $bccButton,
      getBccContainer,
      parsedBcc,
    );
  }
}

var activeCache = null;
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  // trigger on specific meta tag,
  // to support custom domains.
  const $cdnMeta = document.querySelector('meta[name=cdnUrl]')
  if (
    $cdnMeta &&
    ($cdnMeta.getAttribute('content') || '').includes('.cdn.office.net')
  ) {
    activeCache = true
  }

  // also trigger on specific domain,
  // to support the open-email-in-new-window popup.
  if (window.location.host === 'outlook.live.com') {
    activeCache = true
  }

  return activeCache
}

if (isActive()) {
  enableBubble()
}

export default async (params = {}) => {
  if (!isActive()) {
    return false;
  }

  const data = getData(params)
  const parsedTemplate = await parseTemplate(params.quicktext.body, data)

  insertTemplate(Object.assign({
    text: parsedTemplate
  }, params))

  await after(params, data)

  return true
}
