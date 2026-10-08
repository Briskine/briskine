/*
 * Snapshot the elements a selector matches.
 *
 * Plain and serializable, so the same records work
 * whether they came from this document or another tab.
 *
 * Password, card and one-time code fields, and csrf meta tags,
 * always read as empty, so a template can't send them out
 * (eg. in an image url). Matches are kept, so indexes don't shift.
 *
 */

import { querySelectorAllDeep } from './selectors.js'

const sensitiveAutocomplete = [
  'current-password',
  'new-password',
  'one-time-code',
  'cc-number',
  'cc-csc',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
]

function isSensitiveField (element) {
  // option:checked would read the selected value of a sensitive select
  if (element.localName === 'option') {
    const select = element.closest('select')
    return select ? isSensitiveField(select) : false
  }

  // any element, so custom elements wrapping a password input are caught too
  if ((element.getAttribute('type') || '').toLowerCase() === 'password') {
    return true
  }

  // can have multiple tokens, eg. "section-pay billing cc-number"
  const tokens = (element.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/)
  return tokens.some((token) => sensitiveAutocomplete.includes(token))
}

function isTokenMeta (element) {
  return element.localName === 'meta' && /csrf|xsrf|nonce/i.test(element.getAttribute('name') || '')
}

function snapshot (element) {
  const sensitive = isSensitiveField(element)
  const tokenMeta = isTokenMeta(element)

  const attributes = {}
  for (const attribute of element.attributes) {
    const hidden = (sensitive && attribute.name === 'value') || (tokenMeta && attribute.name === 'content')
    attributes[attribute.name] = hidden ? '' : attribute.value
  }

  return {
    text: sensitive ? '' : (element.textContent || '').trim(),
    value: sensitive ? '' : (element.value || ''),
    attributes: attributes,
  }
}

export default function cssMatches (selector = '') {
  if (!selector) {
    return []
  }

  return querySelectorAllDeep(selector, document).map(snapshot)
}
