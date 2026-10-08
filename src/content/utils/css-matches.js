/*
 * Snapshot the elements a selector matches.
 *
 * Plain and serializable, so the same records work
 * whether they came from this document or another tab.
 *
 * Password, card and one-time code fields, and csrf meta tags,
 * always read as empty. Matches are kept, so indexes don't shift.
 *
 * Selectors can't match those elements by their value or state.
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

const sensitiveFields = [
  // any element, so custom elements wrapping a password input are caught too.
  // i ignores case, eg. TYPE="PASSWORD"
  '[type="password" i]',
  // ~= matches one of several tokens, eg. "section-pay billing cc-number"
  ...sensitiveAutocomplete.map((token) => `[autocomplete~="${token}" i]`),
].join(',')

// and the options of a sensitive select
const sensitiveSelector = `${sensitiveFields},select:is(${sensitiveFields}) option`

const tokenMetaSelector = 'meta:is([name*="csrf" i],[name*="xsrf" i],[name*="nonce" i])'

// pseudo-classes that depend on what's in a field
const statePseudoClasses = [
  'checked',
  'default',
  'indeterminate',
  'placeholder-shown',
  'valid',
  'invalid',
  'user-valid',
  'user-invalid',
  'in-range',
  'out-of-range',
  'autofill',
  '-webkit-autofill',
  'blank',
]

// an attribute compared to a value, with an optional namespace
const attributeTest = /^(?:(?:\*|[\w-]*)\|)?([\w-]+)\s*[~|^$*]?=/

// the way the browser reads the selector
function normalizeSelector (selector) {
  const sheet = new CSSStyleSheet()
  sheet.insertRule(`${selector} {}`)
  return sheet.cssRules[0].selectorText
}

// end of the string starting at index, a normalized selector only uses double quotes
function stringEnd (selector, index) {
  let i = index + 1
  while (i < selector.length && selector[i] !== '"') {
    i += selector[i] === '\\' ? 2 : 1
  }
  return i + 1
}

function guardSelector (selector) {
  let guarded = ''
  let i = 0
  while (i < selector.length) {
    const char = selector[i]

    if (char === '"') {
      const end = stringEnd(selector, i)
      guarded += selector.slice(i, end)
      i = end
      continue
    }

    if (char === '[') {
      let end = i + 1
      while (end < selector.length && selector[end] !== ']') {
        end = selector[end] === '"' ? stringEnd(selector, end) : end + 1
      }
      end += 1

      const block = selector.slice(i, end)
      guarded += block
      const name = block.slice(1).match(attributeTest)?.[1]?.toLowerCase()
      if (name === 'value') {
        guarded += `:not(${sensitiveSelector})`
      } else if (name === 'content') {
        guarded += `:not(${tokenMetaSelector})`
      }

      i = end
      continue
    }

    if (char === ':' && selector[i + 1] !== ':') {
      const name = selector.slice(i + 1).match(/^[\w-]+/)?.[0] || ''
      guarded += char + name
      i += 1 + name.length
      if (statePseudoClasses.includes(name.toLowerCase()) && selector[i] !== '(') {
        guarded += `:not(${sensitiveSelector})`
      }
      continue
    }

    guarded += char
    i += 1
  }

  return guarded
}

function isSensitiveField (element) {
  return element.matches(sensitiveSelector)
}

function isTokenMeta (element) {
  return element.matches(tokenMetaSelector)
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

  // throw the native error for an invalid selector
  document.createDocumentFragment().querySelector(selector)

  return querySelectorAllDeep(guardSelector(normalizeSelector(selector)), document).map(snapshot)
}
