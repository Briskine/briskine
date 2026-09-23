/* LinkedIn plugin
 */

import parseTemplate from '../utils/parse-template.js'
import createContact from '../utils/create-contact.js'
import { querySelectorDeep, closestDeep } from '../utils/selectors.js'
import currentUrl from '../utils/current-url.js'

var activeCache = null
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  const url = currentUrl()
  if (
    url.hostname === 'www.linkedin.com'
    // exclude LinkedIn Sales Navigator
    && !url.pathname.startsWith('/sales/')
  ) {
    activeCache = true
  }

  return activeCache
}

async function actions ({ element, template, data}) {
  if (!isActive()) {
    return
  }

  const $parent = closestDeep('[role=dialog]', element)

  if ($parent) {
    // set subject field value.
    // subject is only available for inMail messaging.
    const $subjectField = querySelectorDeep('[name=subject]', $parent)
    if (template.subject && $subjectField) {
      const parsedSubject = await parseTemplate(template.subject, data)
      $subjectField.value = parsedSubject
    }
  }
}

function getToName (element, doc) {
  // get the contact name from messages
  const messageThreadSelectors = [
    // message popup
    '[role=dialog]',
    // organization inbox thread
    '.org-inbox-thread__container',
    // message thread in Messaging interface
    '.msg-thread',
    // post in feed
    '.feed-shared-update-v2',
  ]

  const contactNameSelectors = [
    // contact name in organization inbox message threads
    '.org-inbox-thread__link-to-profile',
    // contact name in message threads
    '.msg-s-event-listitem--other .msg-s-message-group__name',
    // 1. inMail message header
    // 2. Message header in messaging popup (at the top, when complete thread is loaded)
    '.artdeco-entity-lockup__title > *:first-child',
    // Contact name from full-page Messaging view title, when contact hasn't replied yet
    // (or first message is above fold and lazy loaded).
    '.msg-entity-lockup__entity-title',
    // contact name in new message
    '.artdeco-pill',
    // contact name in feed post
    '.feed-shared-actor__name',
    // contact name in message popup title
    '.msg-overlay-bubble-header__title',
  ]

  const $thread = element && closestDeep(messageThreadSelectors.join(','), element)

  // check if a message thread is visible,
  // otherwise we're in a non-messaging textfield.
  if ($thread) {
    let $contact
    // find the first element that matches,
    // where selector ordering in the array matters.
    contactNameSelectors.find((selector) => {
      $contact = querySelectorDeep(selector, $thread)
      return $contact
    })

    if ($contact) {
      // make sure we're not getting "New message" from the message dialog title.
      // in case the other selectors didn't match for new messages.
      const contactText = $contact.textContent || ''
      if (contactText.toLowerCase() !== 'new message') {
        return contactText
      }
    }
  }

  // get the to field from the currently viewed profile
  // eg. for the connect > add note field.

  // legacy profile page, with no web components
  const $currentProfilePicture = querySelectorDeep(
    'img[width="200"][height="200"], img[class*="pv-top-card-profile-picture"]',
    doc.body
  )
  if ($currentProfilePicture && $currentProfilePicture.hasAttribute('alt')) {
    const profilePictureAlt = $currentProfilePicture.getAttribute('alt') || ''
    // remove open to work badge
    return profilePictureAlt.replace(', #OPEN_TO_WORK', '')
  }

  // new profile page, with web components and #interop-outlet
  // to get it from the page title (e.g., "($NOTIFICATION_COUNT) First Name | LinkedIn"),
  // which is prefixed with the notification count when there are any.
  const title = (doc.title || '').replace(/^\(\d+\)\s*/, '')
  if (title.includes('|')) {
    return title.split('|')[0].trim()
  }

  return ''
}

// message boxes and the connect invite note, either can be in a shadow root
const editorSelectors = [
  '[contenteditable=true][role=textbox]',
  'textarea#custom-message',
]

function getLinkedInEditor ({ document: doc }) {
  return querySelectorDeep(editorSelectors.join(','), doc.body)
}

// get all required data from the dom
function getData ({ element, document: doc = document } = {}) {
  if (!isActive()) {
    return
  }

  return getLinkedInData({ element: element || getLinkedInEditor({ document: doc }), document: doc })
}

// a profile page has no editor, but still has a contact,
// so only the message thread lookup needs the element
function getLinkedInData ({ element, document: doc = element?.ownerDocument }) {
  const vars = {
    from: {},
    to: [],
    subject: '',
  }

  if (!doc) {
    return vars
  }

  let fromName = ''
  const $profilePictureSelectors = [
    // global menu
    '.global-nav__me-photo',
    // messaging list popup title
    '.presence-entity__image',
  ]

  const $fromContainer = querySelectorDeep(
    $profilePictureSelectors.join(','),
    doc.body
  )
  if ($fromContainer && $fromContainer.getAttribute('alt')) {
    fromName = $fromContainer.getAttribute('alt')
  }

  if (fromName) {
    vars.from = createContact({name: fromName})
  }

  const toName = getToName(element, doc)
  if (toName) {
    vars.to.push(createContact({name: toName}))
  }

  return vars
}

export default {
  data: getData,
  actions,
}
