/*
 * Collection of query selector functions that pierce shadow dom.
 *
 * For better performance, they just look for the selector in each root.
 * Complex selectors like `body > shadow-dom > .custom` won't work.
 *
 */

export function querySelectorDeep (selector, root = document) {
  const found = root.querySelector(selector)
  if (found) {
    return found
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.shadowRoot) {
        return NodeFilter.FILTER_ACCEPT
      }
      return NodeFilter.FILTER_SKIP
    },
  })

  let host = walker.nextNode()
  while (host) {
    const result = querySelectorDeep(selector, host.shadowRoot)
    if (result) {
      return result
    }
    host = walker.nextNode()
  }

  return null
}

export function closestDeep (selector, el) {
  if (!el || el === document || el === window) {
    return null
  }

  const found = el.closest?.(selector)
  if (found) {
    return found
  }

  const root = el.getRootNode()
  if (root instanceof ShadowRoot) {
    return closestDeep(selector, root.host)
  }

  return null
}
