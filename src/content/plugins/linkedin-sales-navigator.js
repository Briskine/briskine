/* LinkedIn Sales Navigator plugin
 */

import parseTemplate from '../utils/parse-template.js'
import {insertTemplate} from '../editors/editor-universal.js'
import createContact from '../utils/create-contact.js'
import {addAttachments} from '../attachments/attachments.js'

function getToName (element) {
  const messageThreadSelectors = [
    // message popup
    // connect popup
    '[role=dialog]',
    // message inbox
    '.thread-container',
  ]

  const contactNameSelectors = [
    // message popup (:not excludes shared connections in Sales Navigator)
    '.artdeco-entity-lockup__title > *:first-child:not([aria-hidden])',
    // connect/invite popup
    '.artdeco-entity-lockup__title',
    // contact name in new message thread
    '.artdeco-pill',
    // contact name in existing message thread
    'a[href*="/sales/lead/"]',
  ]

  const $thread = element.closest(messageThreadSelectors.join(','))
  if ($thread) {
    let $contact
    contactNameSelectors.some((selector) => {
      $contact = $thread.querySelector(selector)
      return $contact
    })

    if ($contact) {
      return $contact.innerText || ''
    }
  }

  return ''
}

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
  const $salesFromContainer = doc.querySelector('[data-control-name="view_user_menu_from_app_header"]')
  if ($salesFromContainer) {
    fromName = $salesFromContainer.innerText
  }

  vars.from = createContact({name: fromName})

  const toName = getToName(params.element)
  vars.to.push(createContact({name: toName}))

  return vars
}

var activeCache = null
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  if (
    window.location.hostname === 'www.linkedin.com'
    && window.location.pathname.startsWith('/sales/')
  ) {
    activeCache = true
  }

  return activeCache
}

export default async (params = {}) => {
  if (!isActive()) {
    return false
  }

  const data = getData(params)
  const templateWithAttachments = addAttachments(
    await parseTemplate(params.template.body, data),
    params.template.attachments,
  )

  insertTemplate({
    text: templateWithAttachments,
    ...params,
  })
  return true
}
