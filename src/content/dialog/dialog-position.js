/* Dialog positioning and caret detection
 */

import getSelection from '../selection.js'

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
  const pageHeight = window.innerHeight
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  const dialogMetrics = instance.getBoundingClientRect()

  // when we position the dialog next to
  // another element - not next to the cursor (when we position it next to the bubble),
  // or when the focused node is an element (most times when the editor is empty).
  const targetNode = closestRendered(target)
  const targetMetrics = targetNode.getBoundingClientRect()

  // because we use getBoundingClientRect
  // we need to add the scroll position
  // top-left
  let topPos = targetMetrics.top + scrollTop
  let leftPos = targetMetrics.left + scrollLeft

  if (placement.includes('right')) {
    leftPos = leftPos + targetMetrics.width
  }

  if (placement.includes('flip')) {
    leftPos = leftPos - dialogMetrics.width
  }

  if (leftPos < 0) {
    leftPos = 0
  }

  if (placement.includes('bottom')) {
    topPos = topPos + targetMetrics.height
  }

  const bottomSpace = pageHeight - topPos - scrollTop
  const topSpace = topPos - scrollTop
  if (
    // check if we have enough space at the bottom
    // for the maximum dialog height
    bottomSpace < dialogMetrics.height &&
    // and we have enough space at the top
    topSpace > dialogMetrics.height
  ) {
    topPos = topPos - dialogMetrics.height
  }

  return {
    top: topPos,
    left: leftPos,
  }
}

export function getContentEditableCaret (node) {
  const selection = getSelection(node)
  if (selection.rangeCount !== 0) {
    const range = selection.getRangeAt(0)
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
}

const mirrorStyles = [
  // box
  'box-sizing',
  'height',
  'width',
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
    overflow: auto;
    position: absolute;
    visibility: hidden;

    white-space: pre-wrap;
    word-wrap: break-word;
  `
  $mirror.className = element.className

  // mirror styles
  const sourceStyles = window.getComputedStyle(element)
  mirrorStyles.forEach((property) => {
    $mirror.style.setProperty(property, sourceStyles.getPropertyValue(property))
  })

  const sourceMetrics = element.getBoundingClientRect()
  $mirror.style.top = `${sourceMetrics.top}px`
  $mirror.style.left = `${sourceMetrics.left}px`

  // copy content
  $mirror.textContent = element.value.substring(0, element.selectionEnd)

  const $virtualCaret = document.createElement('span')
  $virtualCaret.textContent = '.'
  $mirror.appendChild($virtualCaret)

  // insert mirror
  document.body.appendChild($mirror)

  function cleanup () {
    $mirror.remove()
  }

  return [$virtualCaret, cleanup]
}
