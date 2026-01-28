// Collection of selection helper functions that pierce through shadow dom.
//
// Blink returns the shadow root when using window.getSelection, and the focus is a shadow dom,
// but adds a non-standard getSelection method on the shadow root.
// https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot#instance_methods
// Firefox pierces through shadow dom by default, with window.getSelection.
// Safari has the same behavior as Blink, when using window.getSelection.
// We use the new getComposedRanges method on Selection, to get a Range that pierces
// the shadow dom, when possible.
// Otherwise, use either the blink-proprietary shadowRoot.getSelection method
// or the global window.getSelection.
// https://github.com/WICG/webcomponents/issues/79

function getComposedSelection (node) {
  const selection = window.getSelection()

  if (typeof selection.getComposedRanges === 'function') {
    return selection
  }

  const root = node?.getRootNode?.()
  if (
      root instanceof ShadowRoot
      && typeof root.getSelection === 'function'
  ) {
    // non-standard Blink-only method (before Chrome 137)
    return root.getSelection()
  }

  return selection
}

export function getSelectionRange (node) {
  const selection = getComposedSelection(node)
  const root = node?.getRootNode?.()

  if (selection.rangeCount === 0) {
    return null
  }

  if (
    root instanceof ShadowRoot
    && typeof selection.getComposedRanges === 'function'
  ) {
    const staticRange = selection.getComposedRanges({ shadowRoots: [root] })[0]
    const range = new Range()
    range.setStart(staticRange.startContainer, staticRange.startOffset)
    range.setEnd(staticRange.endContainer, staticRange.endOffset)

    return range
  }

  return selection.getRangeAt(0).cloneRange()
}

export function getSelectionFocus (
  node,
  range = getSelectionRange(node)
) {
  const selection = getComposedSelection(node)
  // default to values from selection,
  // for browsers without support for selection.direction.
  let focusNode = selection.focusNode
  let focusOffset = selection.focusOffset

  // find the focusNode from range,
  // to support shadow dom.
  if (range) {
    if (selection.direction === 'backward') {
      // if backward, the caret is at the start of the range
      focusNode = range.startContainer
      focusOffset = range.startOffset
    } else if (selection.direction) {
      // when direction is "forward" or "none" (when range is collapsed),
      // the caret is at the end.
      focusNode = range.endContainer
      focusOffset = range.endOffset
    }
  }

  return [focusNode, focusOffset]
}

export function setSelectionRange (node, range) {
  return new Promise((resolve) => {
    const selection = getComposedSelection(node)
    // even if setBaseAndExtent is synchronous,
    // some third part editors rely on selection change to notice the change,
    // so that's when we consider it done.
    // also, using selectionchange makes sure the selection was painted
    // on screen, and we can use getBoundingClientRect on it.
    // requestAnimationFrame would be enough for that, if we didn't need
    // the third-party editor support.
    document.addEventListener('selectionchange', () => resolve(range), { once: true })
    // Safari doesn't support selection.addRange(),
    // when the range is in shadow dom,
    // that's why we use setBaseAndExtent.
    selection.setBaseAndExtent(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset
    )
  })
}
