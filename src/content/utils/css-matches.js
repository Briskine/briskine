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
 * A selector that tests the value of a secret attribute is also not
 * allowed to single out those elements, so matching them stays
 * independent of the hidden value.
 *
 */

import { querySelectorAllDeep } from './selectors.js'

// a `value` or `content` attribute compared to a value,
// eg. [value=x] [content^='ab'] [ns|value*="x" i].
// presence alone ([value]) is fine, it doesn't depend on the value.
const secretAttributeTest = /^\s*(?:[\w-]+\|)?(?:value|content)\s*[~|^$*]?=/i

function readsSecretAttribute (selector = '') {
  let tested = false
  // true for each open paren that belongs to a :has(), so a test inside one
  // is flagged separately: :has() can match an outer element by this attribute
  const relative = []

  let i = 0
  while (i < selector.length) {
    const char = selector[i]

    if (char === '(') {
      relative.push(selector.slice(Math.max(0, i - 4), i).toLowerCase() === ':has')
      i += 1
      continue
    }

    if (char === ')') {
      relative.pop()
      i += 1
      continue
    }

    if (char !== '[') {
      i += 1
      continue
    }

    // read the [...] block, skipping over quoted values that may contain ] or [
    let block = ''
    let quote = null
    let j = i + 1
    while (j < selector.length) {
      const inner = selector[j]
      if (quote) {
        if (inner === '\\') {
          block += inner + (selector[j + 1] || '')
          j += 2
          continue
        }
        if (inner === quote) {
          quote = null
        }
      } else if (inner === '"' || inner === "'") {
        quote = inner
      } else if (inner === ']') {
        break
      }
      block += inner
      j += 1
    }

    if (secretAttributeTest.test(block)) {
      tested = true
      if (relative.includes(true)) {
        return { tested: true, hasRelative: true }
      }
    }

    i = j + 1
  }

  return { tested: tested, hasRelative: false }
}

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

  const secret = readsSecretAttribute(selector)

  // can't tell which element the value matched, so return nothing
  if (secret.tested && secret.hasRelative) {
    return []
  }

  const matches = querySelectorAllDeep(selector, document)

  // drop sensitive matches, keep the rest (eg. a normal input[value^=...])
  if (secret.tested) {
    return matches
      .filter((element) => !isSensitiveField(element) && !isTokenMeta(element))
      .map(snapshot)
  }

  return matches.map(snapshot)
}
