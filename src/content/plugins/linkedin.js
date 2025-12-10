/* LinkedIn plugin
 */

import parseTemplate from '../utils/parse-template.js'
import {isQuill} from '../editors/editor-quill.js'
import {insertTemplate} from '../editors/editor-universal.js'
import {insertContentEditableTemplate} from '../editors/editor-contenteditable.js'
import {insertPasteTemplate} from '../editors/editor-paste.js'
import htmlToText from '../utils/html-to-text.js'
import createContact from '../utils/create-contact.js'
import {addAttachments} from '../attachments/attachments.js'
import getSelection from '../selection.js'

async function before (params, data) {
  const $parent = params.element.closest('[role=dialog]')

  if ($parent) {
    // set subject field value.
    // subject is only available for inMail messaging.
    const $subjectField = $parent.querySelector('[name=subject]')
    if (params.quicktext.subject && $subjectField) {
      const parsedSubject = await parseTemplate(params.quicktext.subject, data)
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
    contactNameSelectors.some((selector) => {
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
export function getData (params) {
  const vars = {
    from: {},
    to: [],
    subject: '',
  }

  if (!params?.element) {
    return vars
  }

  const doc = params.element.ownerDocument

  let fromName = ''
  // global profile
  const $fromContainer = doc.querySelector('.global-nav__me-photo')
  if ($fromContainer && $fromContainer.getAttribute('alt')) {
    fromName = $fromContainer.getAttribute('alt')
  }

  vars.from = createContact({name: fromName})

  const toName = getToName(params.element)
  vars.to.push(createContact({name: toName}))

  return vars
}

// zero-width whitespace
// required for multi-line templates in posts/comments/quill
const specialChar = '\u200b'

function focusSpecialCharacter(editorNode) {
  const lastSpecialCharNode = Array.from(editorNode.children).reverse().find((node) => {
    // trim textContent in case we add spaces after the template shortcut
    const text = (node.textContent || '').trim()
    const specialCharPosition = text.indexOf(specialChar)

    // find the node where the special char is at the end
    return (
      specialCharPosition !== -1 &&
      specialCharPosition === text.length - 1
    )
  })

  // node should always be available,
  // but in case we don't find it.
  if (lastSpecialCharNode) {
    // remove the special char from the node,
    // so we don't have issues later with finding the newest inserted one
    // (in case we insert multiple multi-line templates).
    lastSpecialCharNode.textContent = lastSpecialCharNode.textContent.replace(new RegExp(specialChar, 'g'), '')

    // place the focus at the node with the special character
    const range = document.createRange()
    range.selectNodeContents(lastSpecialCharNode)
    range.collapse()

    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

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

function isMessageEditor (element) {
  return (
    element &&
    element.getAttribute('contenteditable') === 'true' &&
    element.getAttribute('role') === 'textbox' &&
    !element.classList.contains('ql-editor')
  )
}

export default async (params = {}) => {
  if (!isActive()) {
    return false
  }

  const data = getData(params)
  const templateWithAttachments = addAttachments(
    await parseTemplate(params.quicktext.body, data),
    params.quicktext.attachments,
  )

  // Quill is used for posts and comments
  if (isQuill(params.element)) {
    // LinkedIn uses a customized Quill editor for posts.
    // Inserting text with newlines causes each block/line to be split into
    // multiple paragraph tags.
    // This causes our range object to change after we insert the text,
    // and places the focus at the start of the editor.
    // Since the inserted dom is changed, we place a special character
    // at the end of the template, so we can later find it and place focus there
    // (at the end of the inserted template).

    // parsed template with special char
    const templateWithSpecialChar = `${htmlToText(templateWithAttachments)}${specialChar}`

    insertContentEditableTemplate({
      text: templateWithSpecialChar,
      ...params,
    })

    // wait for the LinkedIn editor to restructure the inserted template nodes.
    const editorUpdate = new MutationObserver((mutationsList, observer) => {
      // find the previously-placed special character in the editor contents.
      focusSpecialCharacter(params.element)
      observer.disconnect()
    })
    editorUpdate.observe(params.element, {childList: true, subtree: true})

    return true
  }

  // messaging, ember editor.
  // separate handling required for multi-line templates.
  if (isMessageEditor(params.element)) {
    await before(params, data)

    insertPasteTemplate({
      // send only plain text to the paste editor.
      // if the template contains html comments,
      // LinkedIn inserts the complete html markup.
      // LinkedIn messages support only plain text anyway.
      text: htmlToText(templateWithAttachments),
      ...params,
    })

    return true
  }

  // generic editor, including textareas
  insertTemplate({
    text: templateWithAttachments,
    ...params,
  })
  return true
}
