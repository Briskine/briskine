/* Outlook plugin
 */

import parseTemplate from '../utils/parse-template.js';
import {insertTemplate} from '../editors/editor-universal.js';
import createContact from '../utils/create-contact.js';
import {enableBubble} from '../bubble/bubble.js';
import {addAttachments} from '../attachments/attachments.js'

// names and emails are formatted as "full name <name@email.com>"
function parseNameAndEmail (nameAndEmail = '') {
  const index = nameAndEmail.lastIndexOf('<')
  const lastIndex = nameAndEmail.lastIndexOf('>')
  if (index > -1 && lastIndex > -1) {
    return {
      name: nameAndEmail.substring(0, index),
      email: nameAndEmail.substring(index + 1, lastIndex),
    }
  }

  return {
    name: nameAndEmail,
    email: '',
  }
}

function getFieldData (field, $container) {
  var $buttons = $container.querySelectorAll(`
    [draggable="true"],
    [data-lpc-hover-target-id]
  `) || [];
  $buttons.forEach(function ($button) {
    let fullName = ''
    const $fullNameContainer = $button.querySelector('span > span > span > span')
    if ($fullNameContainer) {
      fullName = $fullNameContainer.innerText
    }

    field.push(createContact(parseNameAndEmail(fullName)))
  })
}

// selector for to/cc/bcc containers
function getContainers () {
  // get the parent of each extra field input.

  // [role=main] for the default outlook view.
  // [data-app-section] for the compose popup view.
  return Array.from(document.querySelectorAll(`
      [role=main] [role=textbox]:not([dir]),
      [data-app-section="Form_Content"] [role=textbox]:not([dir])
    `))
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
    // exclude the first (to) container
    .slice(1)
    .find((node) => {
      return Array.from(node.querySelectorAll('[aria-label'))
        .find((node) => {
          // HACK
          // match containers by the length of the aria-label field.
          // will not work for all languages.
          return node.getAttribute('aria-label').length === length
        })
    })
}

function getBccContainer () {
  return getFieldContainer(3)
}

function getFieldButton (length = 2) {
  // [data-app-section] for the compose popup view.
  return Array.from(document.querySelectorAll(`
    [role=main] .ms-Button--command,
    [data-app-section="Form_Content"] .ms-Button--command
  `))
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

    selectorObserver.observe(document.body, {
      childList: true,
      subtree: true
    })

    const timeout = setTimeout(() => {
      selectorObserver.disconnect()
      reject()
    }, 1000)
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

async function addSingleContact ($field, value) {
  $field.focus()
  await new Promise((resolve) => setTimeout(resolve))
  const range = window.getSelection().getRangeAt(0)
  const templateNode = range.createContextualFragment(value)
  range.insertNode(templateNode)
  range.collapse()
  $field.dispatchEvent(new Event('input', {bubbles: true}))

  try {
    await waitForElement(() => getSuggestionButton(value))
    // give it a second to attach event listeners
    await new Promise((resolve) => setTimeout(resolve))

    $field.dispatchEvent(
      new KeyboardEvent('keydown', {
        keyCode: 13,
        which: 13,
        key: 'Enter',
        code: 'Enter',
        bubbles: true
      })
    )

    // give it a second to clean up the suggestions dialog
    await new Promise((resolve) => setTimeout(resolve))
  } catch {
    // continue if we couldn't find the element
    return
  }
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
        from: {},
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

    vars.from = createContact({
      name: fullName,
      email: fromEmail,
    })

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

const urls = [
  'outlook.live.com',
  'outlook.office365.com',
]

var activeCache = null
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }
  activeCache = false

  // check for urls
  const outlookUrl = urls.some((url) => window.location.hostname === url)
  if (outlookUrl) {
    activeCache = true
    return activeCache
  }

  // or detect specific nodes
  // to support custom domains and dynamically created frames,
  // eg. the open-email-in-new-window popup.
  const $owaNodes = document.querySelector(`
    head [href*="cdn.office.net"],
    meta[content*="owamail"],
    link[href*="/owamail/"],
    script[src*="/owamail/"]
  `)
  if ($owaNodes) {
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

  // make the extra fields editable, so we can find them.
  const $main = params.element.closest('[id*="docking_InitVisiblePart"]')
  if ($main) {
    // specific selector to avoid triggering focus when the fields are already editable
    const $to = $main.querySelector('div[tabindex]:nth-child(2):not([role="button"])')
    if ($to) {
      // cache selection
      const selection = window.getSelection()
      const focusNode = selection.focusNode
      const focusOffset = selection.focusOffset
      const anchorNode = selection.anchorNode
      const anchorOffset = selection.anchorOffset

      $to.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
      // give it a second to show the editable from/to/cc/bcc fields
      await new Promise((resolve) => setTimeout(resolve, 100))

      // restore selection
      params.element.focus()
      if (anchorNode && focusNode) {
        window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
      }
    }
  }

  const data = getData(params)
  const parsedTemplate = addAttachments(
    await parseTemplate(params.quicktext.body, data),
    params.quicktext.attachments,
  )

  insertTemplate(Object.assign({
    text: parsedTemplate
  }, params))

  await after(params, data)

  return true
}
