/*
 * css helper
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
import { getSiteMatches } from '../site/site-context.js'
import cached from '../utils/cached.js'

function getValue (record, attribute = '') {
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
      toString: () => getValue(record, attribute),
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

    if (!pattern) {
      return cssArray(cssMatches(selector), attribute)
    }

    // throws for an invalid selector, so a typo shows up the same way
    // as it does reading this page, instead of silently matching nothing
    if (selector) {
      document.createDocumentFragment().querySelector(selector)
    }

    const key = JSON.stringify([pattern, selector])

    return cssArray(await cached(cache, key, () => getSiteMatches(pattern, selector)), attribute)
  }
}
