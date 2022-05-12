const dialogMaxHeight = 250

export function getDialogPosition (targetNode, instance) {
  const pageHeight = window.innerHeight
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  const dialogMetrics = instance.getBoundingClientRect()

  // in case we want to position the dialog next to
  // another element,
  // not next to the cursor.
  // eg. when we position it next to the qa button.
  const targetMetrics = targetNode.getBoundingClientRect()

  // because we use getBoundingClientRect
  // we need to add the scroll position
  let topPos = targetMetrics.top + targetMetrics.height + scrollTop
  let leftPos = targetMetrics.left + scrollLeft

  // if targetNode is range
  if (targetNode instanceof Range) {
    leftPos = leftPos + targetMetrics.width
  }

  // check if we have enough space at the bottom
  // for the maximum dialog height
  const bottomSpace = pageHeight - topPos - scrollTop
  if (bottomSpace < dialogMaxHeight) {
    topPos = topPos - dialogMetrics.height - targetMetrics.height
  }

  return {
    top: topPos,
    left: leftPos,
    targetWidth: targetMetrics.width,
  }
}

export function getContentEditableCaret () {
  const selection = window.getSelection()
  if (selection.rangeCount !== 0) {
    const range = selection.getRangeAt(0)
    // when the caret is collapsed inside an empty element with no text,
    // getClientRects/getBoundingClientRect returns empty or with zero values.
    // this is a spec issue:
    // https://github.com/w3c/csswg-drafts/issues/2514
    // return the endContainer when we can't get the clientRect.
    if (range.collapsed === true && range.endContainer.nodeType === Node.ELEMENT_NODE) {
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
  // spacing
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

  return $virtualCaret
}
