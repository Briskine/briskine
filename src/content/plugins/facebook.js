/* Facebook plugin
 */

import parseTemplate from '../utils/parse-template.js'
import createContact from '../utils/create-contact.js'
import {insertTemplate} from '../editors/editor-universal.js'
import {addAttachments} from '../attachments/attachments.js'

function getFromDetails () {
  var objectMatch = new RegExp('"NAME":.?".*?"')
  var plainUserObject = ''
  // get full name from inline script
  Array.from(document.scripts).some((script) => {
    var match = (script.textContent || '').match(objectMatch)
    if (!script.src && match) {
      plainUserObject = match[0] || ''
      return true
    }
  })

  var fromName = ''
  try {
    var parsedUserObject = JSON.parse(`{${plainUserObject}}`)
    fromName = parsedUserObject.NAME || ''
  } catch {
    // can't parse the user object
  }

  return createContact({
    name: fromName,
    email: ''
  })
}

function getToDetails (editor) {
  // default to messenger view
  let $chat = editor.closest('[role=main]')
  // if not messenger view,
  // check if message popup view on facebook.
  if (!$chat) {
    $chat = editor.closest('[tabindex="-1"]')
  }

  if ($chat) {
    const contactNameAttribute = 'aria-label'
    const $to = $chat.querySelector(`a[${contactNameAttribute}]`)
    if ($to) {
      return [
        createContact({
          name: $to.getAttribute(contactNameAttribute) || '',
          email: ''
        })
      ]
    }
  }

  return []
}

// get all required data from the dom
function getData (params) {
  return {
    from: getFromDetails(),
    to: getToDetails(params.element)
  }
}

let activeCache = null
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  const urls = [
    'www.facebook.com',
    'www.messenger.com',
  ]

  // trigger the extension based on url
  if (urls.find((url) => window.location.hostname === url)) {
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
    await parseTemplate(params.quicktext.body, data),
    params.quicktext.attachments,
  )

  insertTemplate(Object.assign({
    text: parsedTemplate
  }, params))

  return true
}
