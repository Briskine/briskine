// returns the shadow root of the element,
// with support for closed shadow roots, which extensions can open.

import { isExtensionElement } from './extension-element.js'

export default function getShadowRoot (element) {
  if (element?.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  if (element.shadowRoot) {
    return element.shadowRoot
  }

  // our own ui is not a page editor
  if (isExtensionElement(element)) {
    return null
  }

  try {
    // firefox, as a property
    if ('openOrClosedShadowRoot' in element) {
      return element.openOrClosedShadowRoot || null
    }

    return globalThis.chrome?.dom?.openOrClosedShadowRoot?.(element) || null
  } catch {
    return null
  }
}
