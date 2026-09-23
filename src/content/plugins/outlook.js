/* Outlook plugin
 */

import parseTemplate from '../utils/parse-template.js'
import createContact from '../utils/create-contact.js'
import currentUrl from '../utils/current-url.js'
import { getSelectionRange, setSelectionRange } from '../utils/selection.js'

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
  const { hostname } = currentUrl()
  const outlookUrl = urls.some((url) => hostname === url)
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
      // when reading another tab nothing is focused,
      // so there's nothing to restore
      const hadFocus = element.ownerDocument.activeElement === element
      const cachedRange = hadFocus ? getSelectionRange(element) : null

      $to.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
      // wait for the fields
      await waitForElement(() => getToContainer(element), {root: element.ownerDocument.body, settle: false})
        .catch(() => {})

      if (hadFocus) {
        element.focus()
        if (cachedRange) {
          await setSelectionRange(element, cachedRange)
        }
      }
    }
  }
}

// names and emails are sometimes formatted as "full name <name@email.com>".
// eg. when saving as draft and re-opening.
// otherwise they might only be the name, or only the email address.
function parseNameAndEmail (nameAndEmail = '') {
  let name = ''
  let email = ''

  const index = nameAndEmail.lastIndexOf('<')
  const lastIndex = nameAndEmail.lastIndexOf('>')
  if (index > -1 && lastIndex > -1) {
    name = nameAndEmail.substring(0, index)
    email = nameAndEmail.substring(index + 1, lastIndex)
  } else if (nameAndEmail.includes('@')) {
    email = nameAndEmail
  } else {
    name = nameAndEmail
  }

  return {
    name,
    email,
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
    const fullName = $node?.textContent
    if (fullName) {
      field.push(createContact(parseNameAndEmail(fullName)))
    }
  })
}

// the compose form, docked or in the popup.
// the reading pane has its own MSG_*_TO and MSG_*_FROM, so stay inside it.
function getCompose (editable) {
  return editable.closest('[id^="docking_InitVisiblePart"], [data-app-section="Form_Content"]')
    || getParent(editable)
}

// eg. MSG_74cda7ce35c_TO
function getField (editable, name) {
  return getCompose(editable).querySelector(`[id^="MSG_"][id$="_${name}"]`)
}

function getRecipients (editable, name) {
  return getField(editable, name)?.querySelector('[contenteditable=true]')
}

function getToContainer (editable) {
  return getRecipients(editable, 'TO')
}

function getCcContainer (editable) {
  return getRecipients(editable, 'CC')
}

function getBccContainer (editable) {
  return getRecipients(editable, 'BCC')
}

// the buttons have no attributes and translated labels,
// but they're always the fields not shown yet, in this order.
function getFieldButton (editable, name) {
  const hidden = ['CC', 'BCC'].filter((field) => !getField(editable, field))
  const buttons = Array.from(getCompose(editable).querySelectorAll('.fui-Input button'))
  return buttons[hidden.indexOf(name)]
}

function getCcButton (editable) {
  return getFieldButton(editable, 'CC')
}

function getBccButton (editable) {
  return getFieldButton(editable, 'BCC')
}

function getSubjectField (editable) {
  const $subject = getField(editable, 'SUBJECT')
  return $subject?.matches('input') ? $subject : $subject?.querySelector('input')
}

// settle waits one more tick,
// so we don't type into a field outlook is still setting up
function waitForElement (getNode, {root = document.body, settle = true} = {}) {
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
        if (settle) {
          setTimeout(() => resolve($element))
        } else {
          resolve($element)
        }
      }
    })

    selectorObserver.observe(root, {
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
  if (document?.queryCommandEnabled?.('insertText')) {
    document.execCommand('insertText', false, value)
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

// the account menu
function getFromName (doc) {
  return doc.querySelector('#owa-me-control-container button[aria-label]')?.getAttribute('aria-label') || ''
}

// the label is localized ("From: ..."), so take the address out of it
function getFromEmail (editable) {
  const $from = getField(editable, 'FROM')
  const label = $from?.getAttribute('aria-label') || $from?.textContent || ''
  return label.match(/[^\s:<>]+@[^\s:<>]+\.[^\s:<>]+/)?.[0] || ''
}

// the message body is the only multiline textbox
function getOutlookEditor ({ document: doc }) {
  return doc.querySelector('[role=textbox][aria-multiline=true]')
}

// get all required data from the dom
function getData ({ element, document: doc = document } = {}) {
  if (!isActive()) {
    return
  }

  return getOutlookData({ element: element || getOutlookEditor({ document: doc }) })
}

async function getOutlookData ({ element }) {
  const vars = {
    from: {},
    to: [],
    cc: [],
    bcc: [],
    subject: '',
  }

  // makeFieldsEditable walks up from the element
  if (!element) {
    return vars
  }

  await makeFieldsEditable(element)

  vars.from = createContact({
    name: getFromName(element.ownerDocument),
    email: getFromEmail(element),
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
  const cachedRange = getSelectionRange(element)

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
  element.focus({ preventScroll: true })
  if (cachedRange) {
    setSelectionRange(element, cachedRange)
  }
}

export default {
  data: getData,
  actions,
}
