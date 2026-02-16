/* Dialog positioning and caret detection
 */

import { getSelectionRange } from '../utils/selection.js'

// moves up the tree finding the closest "rendered" element
// which doesn't have display: none, so we can get its position.
// we don't use checkVisibility because elements hidden without display: none (e.g., visibility)
// are rendered and we can get their position.
function closestRendered (target) {
  // target can be a Node or Range
  // start with the current element
  let node = target

  // if node is not an element node (range, text node)
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node
  }

  while (node && node !== document.body) {
    // if it has an offsetParent, it is rendered.
    if (node.offsetParent !== null) {
      return node
    }

    // support position: fixed, offsetParent returns null for fixed elements.
    // if offsetParent was null, but display: none is not set, it must be fixed.
    if (window.getComputedStyle(node).display !== 'none') {
      return node
    }

    node = node.parentElement
  }

  return node
}

export function getDialogPosition (target, instance, placement = 'top-left') {
  const dialogMetrics = instance.getBoundingClientRect()
  const targetNode = closestRendered(target)
  const targetMetrics = targetNode.getBoundingClientRect()

  let top = targetMetrics.top
  let left = targetMetrics.left

  if (placement.includes('right')) {
    left += targetMetrics.width

    // check if we have enough space on the right
    const pageWidth = window.innerWidth
    const spaceRight = pageWidth - left
    if (spaceRight < dialogMetrics.width) {
      // flip it on the x-axis if we don't
      placement = placement + '-flip'
    }
  }

  if (placement.includes('flip')) {
    left -= dialogMetrics.width
  }

  if (placement.includes('bottom')) {
    top += targetMetrics.height
  }

  // check if we have enough space at the bottom
  const pageHeight = window.innerHeight
  const spaceBelow = pageHeight - top
  const spaceAbove = targetMetrics.top
  if (
    spaceBelow < dialogMetrics.height
    && spaceAbove > dialogMetrics.height
  ) {
    // flip it on the y-axis if we don't
    top -= dialogMetrics.height
  }

  return {
    top: Math.max(0, top),
    left: Math.max(0, left),
  }
}

export function getContentEditableCaret (node) {
  const range = getSelectionRange(node)
  if (!range) {
    return null
  }

  // when the caret is collapsed inside an empty element with no text,
  // getClientRects/getBoundingClientRect returns empty or with zero values.
  // this is a spec issue:
  // https://github.com/w3c/csswg-drafts/issues/2514
  if (range.collapsed === true && range.endContainer.nodeType === Node.ELEMENT_NODE) {
    // try to get element where the focus is
    const focusNode = range.endContainer.childNodes[range.endOffset]
    if (focusNode) {
      if (focusNode.nodeType === Node.TEXT_NODE && focusNode.previousElementSibling) {
        // Chrome adds a temporary empty text node on the endOffset,
        // which gets removed before we get its clientRect,
        // so we try to get the previous element sibling.
        return focusNode.previousElementSibling
      } else if (focusNode.nodeType === Node.ELEMENT_NODE) {
        // Firefox adds a br tag
        return focusNode
      }
    }

    // in case we couldn't get an element closer to the focus,
    // return the endContainer.
    // firefox returns the contenteditable parent.
    return range.endContainer
  }

  return range
}

const mirrorStyles = [
  // box
  'overflow',
  'border',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'border-width',
  // font
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  // text spacing
  'word-spacing',
  'letter-spacing',
  'line-height',
  'text-decoration',
  'text-indent',
  'text-transform',
  // direction
  'direction',
]

// get caret position in input and textarea,
// using a virtual caret in a mirrored block.
export function getEditableCaret (element) {
  const $mirror = document.createElement('div')
  $mirror.style = `
    box-sizing: border-box;
    position: fixed;
    visibility: hidden;
    pointer-events: none;

    white-space: pre-wrap;
    word-wrap: break-word;
  `
  $mirror.className = element.className

  // mirror styles
  const sourceStyles = window.getComputedStyle(element)
  mirrorStyles.forEach((property) => {
    $mirror.style.setProperty(property, sourceStyles.getPropertyValue(property))
  })

  const { top, left, width, height } = element.getBoundingClientRect()
  $mirror.style.width = `${width}px`
  $mirror.style.height = `${height}px`
  $mirror.style.top = `${top}px`
  $mirror.style.left = `${left}px`

  const $textBefore = document.createElement('span')
  $textBefore.textContent = element.value.substring(0, element.selectionEnd)
  $mirror.appendChild($textBefore)

  const $virtualCaret = document.createElement('span')
  $virtualCaret.textContent = '|'
  $mirror.appendChild($virtualCaret)

  // needed for correct positioning when the textarea is scrolled
  const $textAfter = document.createElement('span')
  $textAfter.textContent = element.value.substring(element.selectionEnd)
  $mirror.appendChild($textAfter)

  document.documentElement.appendChild($mirror)

  // scroll mirroring
  $mirror.scrollTop = element.scrollTop
  $mirror.scrollLeft = element.scrollLeft

  function cleanup () {
    $mirror.remove()
  }

  return [$virtualCaret, cleanup]
}
