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
  // BUG main compose text is also role=textbox
  // BUG when opened in new window, the compose window doesn't contain role=main
  return Array.from(document.querySelectorAll('[role=main] [role=textbox]'))
    .map((node) => {
      return node.parentElement
    })
}

function getToContainer () {
    return getContainers()[0]
}

function getCcContainer () {
  return getFieldContainer(2)
}

function getFieldContainer (length = 2) {
  const $containers = getContainers()
  return $containers
    .find((node) => {
      return Array.from(node.querySelectorAll('[aria-label'))
        .find((node) => {
          return node.getAttribute('aria-label').length === length
        })
    })
}

function getBccContainer () {
  return getFieldContainer(3)
}

function getFieldButton (length = 2) {
  return Array.from(document.querySelectorAll('[role=main] .ms-Button--command'))
    .find(($node) => {
      return $node.innerText.length === length
    })
}

// 2 chars in text
function getCcButton () {
  return getFieldButton(2)
}

// 3 chars in text
function getBccButton () {
  return getFieldButton(3)
}

function getSuggestionButton (email) {
  return function () {
    // "use this address" not in contact list
    const $nonContactList = document.querySelectorAll(`.ms-Suggestions-sectionButton`)
    if (
      $nonContactList.length
      && Array.from($nonContactList).find(($node) => $node.innerText.includes(email))
    ) {
      return $nonContactList
    }

    // contact list suggestion
    // only when the suggestion contains the email and the item is first (is selected)
    const $listSelector = document.querySelector(`.ms-FloatingSuggestionsList [aria-label*="${email}"]`)
    if ($listSelector) {
      return $listSelector
    }

    return null
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
  return new Promise((resolve, reject) => {
    let $element = getNode()
    if ($element) {
      return resolve($element)
    }

    const selectorObserver = new MutationObserver(function (records, observer) {
      $element = getNode()
      if ($element) {
        clearTimeout(timeout)
        observer.disconnect()
        setTimeout(() => {
          resolve($element)
        })
      }
    })

    const timeout = setTimeout(() => {
      selectorObserver.disconnect()
      reject()
    }, 5000)

    selectorObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  })
}

async function updateContactField ($field, value) {
  const splitValues = value.split(',')
  for (const v of splitValues) {
    const cleanValue = v.trim()
    if (elementContains($field, cleanValue)) {
      // value already added
      continue
    }

    await addSingleContact($field, cleanValue)
  }
}

function addSingleContact ($field, value) {
  $field.focus()
  const range = window.getSelection().getRangeAt(0)
  const templateNode = range.createContextualFragment(value)
  range.insertNode(templateNode)
  range.collapse()
  $field.dispatchEvent(new Event('input', {bubbles: true}))

  return waitForElement(getSuggestionButton(value))
    .then(() => {
      return new Promise((resolve) => {
        // give it a second to attach event listeners
        setTimeout(() => {
          $field.dispatchEvent(
            new KeyboardEvent('keydown', {
              keyCode: 13,
              which: 13,
              key: 'Enter',
              code: 'Enter',
              bubbles: true
            })
          )
          resolve()
        })
      })
    })
}

function elementContains ($element, value) {
  return ($element.innerText || '').includes(value)
}

async function updateSection ($container, $button, getNode, value) {
  if ($container) {
    var $input = await getContactField($container)
    return updateContactField($input, value)
  } else if ($button) {
    // click CC/BCC button
    $button.click()
    return waitForElement(getNode).then(($container) => {
      return updateSection($container, $button, getNode, value)
    })
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
    var parsedSubject = await parseTemplate(params.quicktext.subject, data)
    $subject.value = parsedSubject
    $subject.dispatchEvent(new Event('input', {bubbles: true}))
  }

  // updating extra fields values will change the focus,
  // as the fields use contenteditable.
  // cache the focus here, to restore later.
  const selection = window.getSelection()
  const focusNode = selection.focusNode
  const focusOffset = selection.focusOffset
  const anchorNode = selection.anchorNode
  const anchorOffset = selection.anchorOffset

  if (params.quicktext.to) {
    const $to = getToContainer()
    const parsedTo = await parseTemplate(params.quicktext.to, data)
    if ($to && !elementContains($to, parsedTo)) {
      const $toInput = await getContactField($to)
      await updateContactField($toInput, parsedTo)
    }
  }

  if (params.quicktext.cc) {
    var $cc = getCcContainer();
    var parsedCc = await parseTemplate(params.quicktext.cc, data)
    var $ccButton = getCcButton()
    await updateSection(
      $cc,
      $ccButton,
      getCcContainer,
      parsedCc,
    )
  }

  if (params.quicktext.bcc) {
    const $bcc = getBccContainer()
    const parsedBcc = await parseTemplate(params.quicktext.bcc, data)
    const $bccButton = getBccButton()
    await updateSection(
      $bcc,
      $bccButton,
      getBccContainer,
      parsedBcc,
    )
  }

  // restore selection to where it was before changing extra fields
  window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
}

var activeCache = null
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  // when loading assets from the office cdn.
  // to support custom domains and dynamically created frames,
  // eg. the open-email-in-new-window popup.
  const $officeCdn = document.querySelector('head *[href*=".cdn.office.net"]')
  if ($officeCdn) {
    activeCache = true
  }

  return activeCache
}

// enable the bubble with a delay,
// in case we're in the open-email-in-new-window dynamically created popup.
setTimeout(() => {
  if (isActive()) {
    enableBubble()
  }
}, 500)

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
