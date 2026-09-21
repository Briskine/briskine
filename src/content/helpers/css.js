/*
 * Css helper
 *
 * {{css ".price"}} - text of the first match
 * {{css ".link" "href"}} - attribute of the first match
 * {{#each (css ".item")}}{{this}}{{/each}} - all matches
 * {{lookup (css ".field") "value"}} - field value of the first match
 *
 * Reads the tab of the {{#site}} block it's in, or this page outside one.
 *
 */

import cssMatches from '../utils/css-matches.js'
import { getSiteMatches } from '../utils/site-context.js'

function render (record, attribute = '') {
  if (attribute) {
    return record.attributes?.[attribute] || ''
  }

  return record.text || ''
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

// a new cache per render, so a second insert gets fresh data
export default function createCss (cache = new Map()) {
  return async function css (...args) {
    // last argument is the handlebars options object
    const options = args.pop()
    const [selector = '', attribute = ''] = args
    // set by the {{#site}} block we're in, if any
    const pattern = options.data?.site?.pattern

    if (!selector) {
      return cssArray()
    }

    if (!pattern) {
      // an invalid selector throws, and parseTemplate renders the error
      return cssArray(cssMatches(selector), attribute)
    }

    const key = `${pattern}\u0000${selector}`
    if (!cache.has(key)) {
      cache.set(key, getSiteMatches(pattern, selector))
    }

    return cssArray(await cache.get(key), attribute)
  }
}
