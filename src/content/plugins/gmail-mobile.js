/* Gmail mobile (small-screen) plugin
 */

import parseTemplate from '../utils/parse-template.js'
import {insertTemplate} from '../editors/editor-universal.js'
import createContact from '../utils/create-contact.js'
import {addAttachments} from '../attachments/attachments.js'

// get all required data from the dom
function getData () {
  const data = {
    from: {},
    to: [],
    cc: [],
    bcc: [],
    subject: '',
  }

  const fromName = document.querySelector('.Bu')?.innerText
  const fromEmail = document.querySelector('.Cu')?.innerText
  if (fromName && fromEmail) {
    data.from = createContact({
      email: fromEmail,
      name: fromName,
    })
  }

  const fields = [ 'to', 'cc', 'bcc' ]
  fields.forEach((f) => {
    const $container = document.querySelector(`#cmae_compose${f}`)
    if ($container) {
      data[f] = Array.from(
          $container.querySelectorAll(`[id^="compose${f}_"]`)
        ).map(($person) => {
          const name = $person.querySelector('.Uf')?.innerText || ''
          const email = $person.querySelector('.Sf')?.innerText || ''

          return createContact({
            email: email,
            name: name,
          })
        })
    }
  })

  data.subject = document.querySelector('#cmcsubj')?.value

  return data
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
    && window.location.pathname.includes(gmailMobileToken)
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

  return true
}
