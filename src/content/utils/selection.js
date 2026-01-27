// getSelection that pierces through shadow dom.
// Blink returns the shadow root when using window.getSelection, and the focus is a shadow dom,
// but adds a non-standard getSelection method on the shadow root.
// https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot#instance_methods
// Firefox pierces through shadow dom by default, with window.getSelection.
// Safari has the same behavior as Blink, but provides no workarounds,
// so getting the selection from shadow dom is not possible there.
// We'll have to refactor the selection handling after the upcoming getComposedRange method is implemented:
// https://github.com/WICG/webcomponents/issues/79
export function getComposedSelection (node) {
  const selection = window.getSelection()

  const root = node?.getRootNode?.()
  if (
      root instanceof ShadowRoot
      && root.getSelection === 'function'
      && typeof selection.getComposedRanges !== 'function'
    ) {
    // non-standard Blink-only method
    return root.getSelection()
  }

  return selection
}

export function getSelectionRange (node) {
  const root = node?.getRootNode?.()
  const selection = getComposedSelection(node)

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
