/*
 * CSS query selector helper
 *
 * {{css ".price"}} - text of the first match
 * {{css ".link" "href"}} - attribute of the first match
 * {{#each (css ".item")}}{{this}}{{/each}} - all matches
 * {{lookup (css ".field") "value"}} - field value of the first match
 *
 */

import { querySelectorAllDeep } from '../utils/selectors.js'

// renders either the match text or an attribute
function render (record, attribute = '') {
  if (attribute) {
    return record.attributes?.[attribute] || ''
  }

  return record.text || ''
}

// element snapshot that survives structuredClone
function snapshot (element) {
  const attributes = {}
  for (const attribute of element.attributes) {
    attributes[attribute.name] = attribute.value
  }

  return {
    text: (element.textContent || '').trim(),
    // expose value for form fields
    // {{lookup (css "input") "value"}}
    value: element.value || '',
    attributes: attributes,
  }
}

// return the matches as an array, with the first match's properties
// exposed directly on it, the same way contactsArray does for to/cc/bcc.
// {{css ".x"}} renders the first match, {{#each (css ".x")}} loops over all of them.
function cssArray (records = [], attribute = '') {
  const context = []
  records.forEach((record) => {
    context.push({
      value: record.value,
      attributes: record.attributes,
      // default render
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

  // invalid selectors throw, and parseTemplate renders the error
  const elements = querySelectorAllDeep(selector, document)

  return cssArray(elements.map(snapshot), attribute)
}
