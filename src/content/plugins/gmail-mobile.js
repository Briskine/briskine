/* Gmail mobile (small-screen) plugin
 */

 import { register } from '../plugin.js'
import currentUrl from '../utils/current-url.js'
import createContact from '../utils/create-contact.js'

let activeCache = null
const gmailMobileToken = '/mu/'
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  const url = currentUrl()
  // trigger the extension based on url
  if (
    url.hostname === 'mail.google.com'
    && url.pathname.includes(gmailMobileToken)
  ) {
    activeCache = true
  }

  return activeCache
}

const regExEmail = /([\w!.%+-])+@([\w-])+(?:\.[\w-]+)+/

const bodySelector = '#cmcbody'
const fromSelector = '#cmcfrom'
const subjectSelector = '#cmcsubj'
const fieldSelector = (field) => `#cmae_compose${field}`
const contactSelector = (field) => `[id^="compose${field}_"]`

function text ($node) {
  return $node?.textContent?.trim() || ''
}

// leaf nodes, skipping decorative ones, like the avatar initial
function contactStrings ($container) {
  return Array.from($container.querySelectorAll('*'))
    .filter(($node) => !$node.firstElementChild && !$node.closest('[aria-hidden=true]'))
    .map(text)
    .filter(Boolean)
}

function parseContact ($container) {
  const strings = contactStrings($container)
  return createContact({
    email: strings.find((string) => regExEmail.test(string)) || '',
    name: strings.find((string) => !regExEmail.test(string)) || '',
  })
}

function getGmailMobileEditor ({ document: doc }) {
  return doc.querySelector(bodySelector)
}

// get all required data from the dom
function getData ({ element, document: doc = document } = {}) {
  if (!isActive()) {
    return false
  }

  return getGmailMobileData({ element: element || getGmailMobileEditor({ document: doc }) })
}

function getGmailMobileData ({ element }) {
  const data = {
    from: {},
    to: [],
    cc: [],
    bcc: [],
    subject: '',
  }

  if (!element) {
    return data
  }

  const doc = element.ownerDocument

  const fromEmail = text(doc.querySelector(fromSelector))
  if (fromEmail) {
    // in the alias list, the name is right before the matching email
    const $aliasEmail = Array.from(doc.querySelectorAll('div')).reverse().find(($node) => {
      return text($node) === fromEmail
    })
    data.from = createContact({
      email: fromEmail,
      name: text($aliasEmail?.previousElementSibling),
    })
  }

  const fields = [ 'to', 'cc', 'bcc' ]
  fields.forEach((field) => {
    const $container = doc.querySelector(fieldSelector(field))
    if ($container) {
      data[field] = Array.from(
        $container.querySelectorAll(contactSelector(field))
      ).map(parseContact)
    }
  })

  data.subject = doc.querySelector(subjectSelector)?.value || ''

  return data
}

register('data', getData)
