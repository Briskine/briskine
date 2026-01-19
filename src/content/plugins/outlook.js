/* Outlook plugin
 */

import parseTemplate from '../utils/parse-template.js'
import createContact from '../utils/create-contact.js'
import { register } from '../plugin.js'

const urls = [
  'outlook.live.com',
  'outlook.office365.com',
]

let activeCache = null
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

async function makeFieldsEditable (element) {
  // make the extra fields editable, so we can find them.
  const $main = element.closest('[id*="docking_InitVisiblePart"]')
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
      element.focus()
      if (anchorNode && focusNode) {
        window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
      }
    }
  }
}

// names and emails are sometimes formatted as "full name <name@email.com>".
// eg. when saving as draft and re-opening.
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

function getParent (editable) {
  // [role=main] for the default outlook view.
  // [data-app-section] for the compose popup view.
  return editable.closest(`
    [role=main],
    [data-app-section="Form_Content"]
  `)
}

function getFieldData (field, $container) {
  var $buttons = $container.querySelectorAll(':scope > [contenteditable]')
  $buttons.forEach(function ($button) {
    const $node = $button?.querySelector?.('[class*="textContainer-"], [class*="individualText-"]')
    const fullName = $node?.innerText
    if (fullName) {
      field.push(createContact(parseNameAndEmail(fullName)))
    }
  })
}

// selector for to/cc/bcc containers
function getContainers (editable) {
  return Array.from(getParent(editable).querySelectorAll('[role=presentation][contenteditable]'))
}

function getToContainer (editable) {
  return getContainers(editable)[0]
}

function getCcContainer (editable) {
  return getContainers(editable)[1]
}

function getBccContainer (editable) {
  return getContainers(editable)[2]
}

function getFieldButton (editable, length = 2) {
  // [data-app-section] for the compose popup view.
  return Array.from(getParent(editable).querySelectorAll('.fui-Input button'))
    .find(($node) => {
      return $node.innerText.length === length
    })
}

// 2 chars in text
function getCcButton (editable) {
  return getFieldButton(editable, 2)
}

// 3 chars in text
function getBccButton (editable) {
  return getFieldButton(editable, 3)
}

function getSubjectField (editable) {
  // in case we find more fields
  const inputs = Array.from(getParent(editable).querySelectorAll('input[type=text][autocomplete=off]'))
  // get the last one
  return inputs.pop()
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
    }, 2000)
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

  if (document?.queryCommandEnabled?.('insertText')) {
    document.execCommand('insertText', false, ',')
  }
}

function elementContains ($element, value) {
  return ($element.innerText || '').includes(value)
}

async function updateSection ($container, $button, getNode, value) {
  if ($container) {
    return updateContactField($container, value)
  } else if ($button) {
    // click CC/BCC button
    $button.click()
    return waitForElement(getNode).then(($container) => {
      return updateSection($container, $button, getNode, value)
    })
  }
}

// get all required data from the dom
export async function getData ({ element }) {
  if (!isActive()) {
    return
  }

  await makeFieldsEditable(element)

  const vars = {
    from: {},
    to: [],
    cc: [],
    bcc: [],
    subject: '',
  }

  if (!element) {
    return vars
  }

  const doc = element.ownerDocument

  const $from = doc.querySelector('#O365_MainLink_Me > div > div:nth-child(1)')
  let fullName = ''
  if ($from) {
    fullName = $from.textContent
  }

  // BUG only works if "From" field is visible
  let fromEmail = ''
  // finds the From button, then the read-only from field after the button
  const $fromEmailButton = doc.querySelector('[role=complementary] [aria-haspopup=menu] + * [aria-haspopup=dialog]')
  if ($fromEmailButton) {
    fromEmail = $fromEmailButton.innerText
  }

  vars.from = createContact({
    name: fullName,
    email: fromEmail,
  })

  const editable = element

  var $to = getToContainer(editable)
  if ($to) {
    getFieldData(vars.to, $to)
  }

  var $cc = getCcContainer(editable)
  if ($cc) {
    getFieldData(vars.cc, $cc)
  }

  var $bcc = getBccContainer(editable)
  if ($bcc) {
    getFieldData(vars.bcc, $bcc)
  }

  const $subject = getSubjectField(editable)
  if ($subject) {
    vars.subject = $subject.value
  }

  return vars
}

async function actions ({ element, template, data }) {
  if (!isActive()) {
    return
  }

  await makeFieldsEditable(element)

  const editable = element
  const $subject = getSubjectField(editable)
  if (template.subject && $subject) {
    var parsedSubject = await parseTemplate(template.subject, data)
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

  if (template.to) {
    const $to = getToContainer(editable)
    const parsedTo = await parseTemplate(template.to, data)
    if ($to && !elementContains($to, parsedTo)) {
      await updateContactField($to, parsedTo)
    }
  }

  if (template.cc) {
    var $cc = getCcContainer(editable)
    var parsedCc = await parseTemplate(template.cc, data)
    var $ccButton = getCcButton(editable)
    await updateSection(
      $cc,
      $ccButton,
      () => getCcContainer(editable),
      parsedCc,
    )
  }

  if (template.bcc) {
    const $bcc = getBccContainer(editable)
    const parsedBcc = await parseTemplate(template.bcc, data)
    const $bccButton = getBccButton(editable)
    await updateSection(
      $bcc,
      $bccButton,
      () => getBccContainer(editable),
      parsedBcc,
    )
  }

  // restore selection to where it was before changing extra fields
  window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
}

register('data', getData)
register('actions', actions)
