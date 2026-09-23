/* LinkedIn Sales Navigator plugin
 */

import createContact from '../utils/create-contact.js'
import currentUrl from '../utils/current-url.js'

let activeCache = null
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  const url = currentUrl()
  if (
    url.hostname === 'www.linkedin.com'
    && url.pathname.startsWith('/sales/')
  ) {
    activeCache = true
  }

  return activeCache
}

const messageThreadSelectors = [
  // message popup
  // connect popup
  '[role=dialog]',
  // message inbox
  '.thread-container',
]

function getToName (element) {
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
    const $contact = $thread.querySelector(contactNameSelectors.join(','))
    if ($contact) {
      return $contact.textContent || ''
    }
  }

  return ''
}

function getSalesNavigatorEditor ({ document: doc }) {
  return doc.querySelector(
    messageThreadSelectors.map((selector) => `${selector} textarea`).join(',')
  )
}

function getData ({ element, document: doc = document } = {}) {
  if (!isActive()) {
    return
  }

  return getSalesNavigatorData({ element: element || getSalesNavigatorEditor({ document: doc }) })
}

function getSalesNavigatorData ({ element }) {
  const vars = {
    from: {},
    to: [],
    subject: '',
  }

  if (!element) {
    return vars
  }

  const doc = element.ownerDocument

  let fromName = ''
  const $salesFromContainer = doc.querySelector('[data-control-name="view_user_menu_from_app_header"]')
  if ($salesFromContainer) {
    fromName = $salesFromContainer.innerText
  }

  vars.from = createContact({name: fromName})

  const toName = getToName(element)
  vars.to.push(createContact({name: toName}))

  return vars
}

export default {
  data: getData,
}
