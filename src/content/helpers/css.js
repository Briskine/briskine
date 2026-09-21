/*
 * Css helper
 *
 * {{css ".price"}} - text of the first match
 * {{css ".link" "href"}} - attribute of the first match
 * {{#each (css ".item")}}{{this}}{{/each}} - all matches
 * {{lookup (css ".field") "value"}} - field value of the first match
 *
 */

import { querySelectorAllDeep } from '../utils/selectors.js'

function render (record, attribute = '') {
  if (attribute) {
    return record.attributes?.[attribute] || ''
  }

  return record.text || ''
}

// plain and serializable, so it survives structuredClone from another tab
function snapshot (element) {
  const attributes = {}
  for (const attribute of element.attributes) {
    attributes[attribute.name] = attribute.value
  }

  return {
    text: (element.textContent || '').trim(),
    value: element.value || '',
    attributes: attributes,
  }
}

// first match exposed on the array, the same way contactsArray does for to/cc/bcc
function cssArray (records = [], attribute = '') {
  const context = []
  records.forEach((record) => {
    context.push({
      value: record.value,
      attributes: record.attributes,
      toString: () => render(record, attribute),
    })
  })

  if (context.length) {
    Object.entries(context[0]).forEach(([key, value]) => context[key] = value)
  }

  return context
}

export default function css (...args) {
  // last argument is the handlebars options object
  args.pop()
  const [selector = '', attribute = ''] = args

  if (!selector) {
    return cssArray()
  }

  // an invalid selector throws, and parseTemplate renders the error
  return cssArray(querySelectorAllDeep(selector, document).map(snapshot), attribute)
}
