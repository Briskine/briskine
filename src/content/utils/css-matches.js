/*
 * Snapshot the elements a selector matches.
 *
 * Plain and serializable, so the same records work
 * whether they came from this document or another tab.
 *
 */

import { querySelectorAllDeep } from './selectors.js'

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

export default function cssMatches (selector = '') {
  if (!selector) {
    return []
  }

  return querySelectorAllDeep(selector, document).map(snapshot)
}
