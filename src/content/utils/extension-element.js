import { dialogTagPrefix, bubbleTagPrefix } from '../../config.js'

export function scopeTagName (prefix = '') {
  return `${prefix}${Date.now().toString(36)}`
}

function matchesTagPrefix (node, prefixes) {
  const tagName = node?.tagName?.toLowerCase?.()
  if (!tagName) {
    return false
  }

  return prefixes.some((prefix) => tagName.startsWith(prefix))
}

function hasAncestorTag (node, prefixes) {
  let current = node
  while (current) {
    if (matchesTagPrefix(current, prefixes)) {
      return true
    }

    // walk out of shadow roots, to support nested ones
    const root = current.getRootNode?.()
    current = root instanceof ShadowRoot ? root.host : current.parentElement
  }

  return false
}

export function isExtensionElement (node) {
  return hasAncestorTag(node, [dialogTagPrefix, bubbleTagPrefix])
}

export function isBubbleElement (node) {
  return hasAncestorTag(node, [bubbleTagPrefix])
}
