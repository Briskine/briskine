/* Facebook plugin
 */

import createContact from '../utils/create-contact.js'
import currentUrl from '../utils/current-url.js'

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
  const { hostname } = currentUrl()
  if (urls.find((url) => hostname === url)) {
    activeCache = true
  }

  return activeCache
}

// facebook.com ships the logged-in user in an inline script.
function nameFromScripts (doc) {
  var objectMatch = new RegExp('"NAME":.?".*?"')
  var plainUserObject = ''
  // get full name from inline script
  Array.from(doc.scripts).some((script) => {
    var match = (script.textContent || '').match(objectMatch)
    if (!script.src && match) {
      plainUserObject = match[0] || ''
      return true
    }
  })

  try {
    return JSON.parse(`{${plainUserObject}}`).NAME || ''
  } catch {
    // can't parse the user object
    return ''
  }
}

// messenger ships no user object, and exposes the name nowhere structural.
// get it from the manage notifications settings button instead, english only.
const manageNotificationsPattern = /^Manage (.+) notification settings$/i
function nameFromNotifications (doc) {
  const $manage = doc.querySelector(
    '[aria-label^="Manage " i][aria-label$=" notification settings" i]'
  )
  const match = $manage?.getAttribute('aria-label').match(manageNotificationsPattern)

  return match?.[1] || ''
}

function getFromDetails (doc) {
  return createContact({
    name: nameFromScripts(doc) || nameFromNotifications(doc),
    email: '',
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

  if (!$chat) {
    return []
  }

  // in an open thread the contact is a profile link in the conversation heading.
  const $heading = $chat.querySelector('h3 a[href]')
  if ($heading) {
    return [
      createContact({
        name: $heading.textContent.trim(),
        email: '',
      })
    ]
  }

  // composing a new message where recipients are chips in the to field
  const $recipients = Array.from($chat.querySelectorAll('[role=list][aria-label] [role=listitem]'))

  return $recipients.map(($recipient) => createContact({
    name: $recipient.textContent.trim(),
    email: '',
  }))
}

function getFacebookEditor ({ document: doc }) {
  return doc.querySelector('[contenteditable=true][role=textbox]')
}

// get all required data from the dom
function getData ({ element, document: doc = document } = {}) {
  if (!isActive()) {
    return false
  }

  // find the editor ourselves when nothing is focused,
  const editor = element || getFacebookEditor({ document: doc })
  if (!editor) {
    return false
  }

  return {
    from: getFromDetails(editor.ownerDocument),
    to: getToDetails(editor),
  }
}

export default {
  data: getData,
}
