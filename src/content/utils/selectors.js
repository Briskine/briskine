/*
 * Collection of query selector functions that pierce shadow dom.
 *
 * For better performance, they just look for the selector in each root.
 * Complex selectors like `body > shadow-dom > .custom` won't work.
 *
 */

function* shadowHosts (root) {
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
    yield host
    host = walker.nextNode()
  }
}

export function querySelectorDeep (selector, root = document) {
  const found = root.querySelector(selector)
  if (found) {
    return found
  }

  for (const host of shadowHosts(root)) {
    const result = querySelectorDeep(selector, host.shadowRoot)
    if (result) {
      return result
    }
  }

  return null
}

export function querySelectorAllDeep (selector, root = document) {
  const found = [...root.querySelectorAll(selector)]

  for (const host of shadowHosts(root)) {
    found.push(...querySelectorAllDeep(selector, host.shadowRoot))
  }

  return found
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
