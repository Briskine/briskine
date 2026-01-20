/* LinkedIn plugin
 */

import parseTemplate from '../utils/parse-template.js'
import createContact from '../utils/create-contact.js'
import { register } from '../plugin.js'

var activeCache = null
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  if (
    window.location.hostname === 'www.linkedin.com'
    // exclude LinkedIn Sales Navigator
    && !window.location.pathname.startsWith('/sales/')
  ) {
    activeCache = true
  }

  return activeCache
}

async function actions ({ element, template, data}) {
  if (!isActive()) {
    return
  }

  const $parent = element.closest('[role=dialog]')

  if ($parent) {
    // set subject field value.
    // subject is only available for inMail messaging.
    const $subjectField = $parent.querySelector('[name=subject]')
    if (template.subject && $subjectField) {
      const parsedSubject = await parseTemplate(template.subject, data)
      $subjectField.value = parsedSubject
    }
  }
}

function getToName (element) {
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

  const $thread = element.closest(messageThreadSelectors.join(','))

  // check if a message thread is visible,
  // otherwise we're in a non-messaging textfield.
  if ($thread) {
    let $contact
    // find the first element that matches,
    // where selector ordering in the array matters.
    contactNameSelectors.find((selector) => {
      $contact = $thread.querySelector(selector)
      return $contact
    })

    if ($contact) {
      // make sure we're not getting "New message" from the message dialog title.
      // in case the other selectors didn't match for new messages.
      const contactText = $contact.innerText || ''
      if (contactText.toLowerCase() !== 'new message') {
        return contactText
      }
    }
  }

  // get the to field from the currently viewed profile
  // eg. for the connect > add note field.
  const $currentProfilePicture = element.ownerDocument.querySelector('img[width="200"][height="200"], img[class*="pv-top-card-profile-picture"]')
  if ($currentProfilePicture && $currentProfilePicture.hasAttribute('alt')) {
    const profilePictureAlt = $currentProfilePicture.getAttribute('alt') || ''
    // remove open to work badge
    return profilePictureAlt.replace(', #OPEN_TO_WORK', '')
  }

  return ''
}

// get all required data from the dom
export function getData ({ element, _active }) {
  if (!isActive() && !_active) {
    return
  }

  const vars = {
    from: {},
    to: [],
    subject: '',
  }

  if (!element) {
    return vars
  }

  // get document or shadowRoot
  const parent = element.getRootNode()

  let fromName = ''
  const $profilePictureSelectors = [
    // global menu
    '.global-nav__me-photo',
    // messaging list popup title
    '.presence-entity__image',
  ]

  const $fromContainer = parent.querySelector($profilePictureSelectors.join(','))
  if ($fromContainer && $fromContainer.getAttribute('alt')) {
    fromName = $fromContainer.getAttribute('alt')
  }

  vars.from = createContact({name: fromName})

  const toName = getToName(element)
  vars.to.push(createContact({name: toName}))

  return vars
}

register('data', getData)
register('actions', actions)
