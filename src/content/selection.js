// getSelection that pierces through shadow dom.
// Blink returns the shadow root when using window.getSelection, and the focus is a shadow dom,
// but adds a non-standard getSelection method on the shadow root.
// https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot#instance_methods
// Firefox pierces through shadow dom by default, with window.getSelection.
// Safari has the same behavior as Blink, but provides no workarounds,
// so getting the selection from shadow dom is not possible there.
// We'll have to refactor the selection handling after the upcoming getComposedRange method is implemented:
// https://github.com/WICG/webcomponents/issues/79
export default function getComposedSelection (node) {
  if (node) {
    const rootNode = node.getRootNode()
    if (rootNode instanceof ShadowRoot && typeof rootNode.getSelection === 'function') {
      // HACK non-standard Blink-only method
      return rootNode.getSelection()
    }
  }

  return window.getSelection()
}
