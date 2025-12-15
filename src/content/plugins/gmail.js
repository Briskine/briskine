/* eslint-disable no-useless-escape */
/* Gmail plugin
 */

import parseTemplate from '../utils/parse-template.js'
import {insertTemplate} from '../editors/editor-universal.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import createContact from '../utils/create-contact.js'
import {addAttachments} from '../attachments/attachments.js'

const fromFieldSelector = '.az2'
const textfieldContainerSelector = '.M9'

var regExString = /"?([^ ]*)\s*(.*)"?\s*[(<]([^>)]+)[>)]/
var regExEmail = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/

function parseString (string = '') {
    var match = regExString.exec(string.trim())
    var data = {
        name: '',
        first_name: '',
        last_name: '',
        email: ''
    }

    if (match && match.length >= 4) {
        data.first_name = match[1].replace('"', '').trim()
        data.last_name = match[2].replace('"', '').trim()
        data.name = data.first_name + (data.first_name && data.last_name ? ' ' : '') + data.last_name
        data.email = match[3]
    } else {
        // try to match the email
        match = regExEmail.exec(string)
        if (match) {
            data.email = match[0]
        }
    }

    return data
}

function getFromField (container) {
  return container.querySelector(fromFieldSelector)
}

// get all required data from the dom
function getData (params) {
  const data = {
    from: {},
    to: [],
    cc: [],
    bcc: [],
    subject: '',
  }

  if (isContentEditable(params.element)) {
    // get the email address from the title
    const email = (document.title || '').split(' ').find((part) => part.includes('@')) || ''
    // find the email node from the user details popup
    // visible on hovering the google account on the top-right
    const emailNode = Array.from(document.querySelectorAll('div')).reverse().find((node) => {
      return node.innerText === email
    })
    // the full name node is before the email node
    const fullNameNode = emailNode ? emailNode.previousElementSibling : null
    const fullName = fullNameNode ? fullNameNode.innerText : ''
    data.from = createContact({
      name: fullName,
      email: email,
    })

    const $container = params.element.closest(textfieldContainerSelector)
    if ($container) {
      // if we use multiple aliases,
      // get from details from the alias selector at the top of the compose box.
      const $fromSelect = getFromField($container)
      if ($fromSelect) {
        data.from = parseString($fromSelect.innerText)
      }

      [ 'to', 'cc', 'bcc' ].forEach((fieldName) => {
        data[fieldName] = Array.from(
          $container.querySelectorAll(`input[name=${fieldName}], [name=${fieldName}] [role=option]`)
        ).map((field) => {
          if (field.value) {
            return parseString(field.value)
          }

          const email = field.getAttribute('data-hovercard-id')
          if (email) {
            return createContact({
              email: email,
              name: field.getAttribute('data-name')
            })
          }

          return {}
        })
      })

      const $subjectField = $container.querySelector('input[name=subjectbox]')
      if ($subjectField) {
        data.subject = ($subjectField.value || '').replace(/^Re: /, '')
      }
    }
  }

  return data
}

// from field support for aliases
function setFromField ($textfield, aliasEmail = '') {
  // get current compose container,
  // in case we are in reply area.
  const $container = $textfield.closest(textfieldContainerSelector)

  if ($container) {
    const selector = getFromField($container)
    // check if the alias is already selected
    if (selector?.innerText?.includes?.(aliasEmail)) {
      return
    }

    const $option = $container.querySelector(`[value="${aliasEmail}"][role=menuitem]`)
    if ($option) {
      // select option
      $option.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}))
      $option.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}))
    }
  }
}

function extraField ($parent, fieldName) {
  if (!parent) {
    return
  }

  return $parent.querySelector(`textarea[name=${fieldName}], [name=${fieldName}] input`)
}

async function after (params, data) {
  const $parent = params.element.closest(textfieldContainerSelector)
  if (!$parent) {
    return
  }

  const $subject = $parent.querySelector('input[name=subjectbox]')
  // set subject only when the subject field is visible.
  // makes sure we don't break threads when replying.
  if (
    params.template.subject
    && $subject
    && $subject.getBoundingClientRect().width
  ) {
    const parsedSubject = await parseTemplate(params.template.subject, data)
    $subject.value = parsedSubject
  }

  const $recipients = $parent.querySelector('.aoD.hl')
  if (
    (
      params.template.to ||
      params.template.cc ||
      params.template.bcc
    ) &&
    $recipients
  ) {
    // click the receipients row.
    // a little jumpy,
    // but the only to way to show the new value.
    $recipients.dispatchEvent(new MouseEvent('click', {bubbles: true}))
  }

  if (params.template.to) {
    const parsedTo = await parseTemplate(params.template.to, data)
    const $toField = extraField($parent, 'to')
    if ($toField) {
      $toField.value = parsedTo
      $toField.dispatchEvent(new FocusEvent('blur'))
    }
  }

  const buttonSelectors = {
    cc: '.aB.gQ.pE',
    bcc: '.aB.gQ.pB',
  }

  for (const fieldName of ['cc', 'bcc']) {
    if (params.template[fieldName]) {
      const parsedField = await parseTemplate(params.template[fieldName], data)
      $parent.querySelector(buttonSelectors[fieldName]).dispatchEvent(new MouseEvent('click', {bubbles: true}))
      const $field = extraField($parent, fieldName)
      if ($field) {
        $field.value = parsedField
        $field.dispatchEvent(new FocusEvent('blur'))
      }
    }
  }
}

let activeCache = null
const gmailMobileToken = '/mu/'
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  // trigger the extension based on url
  if (
    window.location.hostname === 'mail.google.com'
    && !window.location.pathname.includes(gmailMobileToken)
  ) {
    activeCache = true
  }

  return activeCache
}

export default async (params = {}) => {
    if (!isActive()) {
        return false
    }

    var data = getData(params)
    const parsedTemplate = addAttachments(
      await parseTemplate(params.template.body, data),
      params.template.attachments
    )

    insertTemplate(Object.assign({
        text: parsedTemplate
    }, params))

    await after(params, data)

    // from field support, when using multiple aliases.
    // set the from field before getting data,
    // to have up-to-date data.
    if (params.template.from) {
        setFromField(params.element, params.template.from)
    }

    return true
}
