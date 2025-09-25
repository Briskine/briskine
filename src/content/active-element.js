// returns the active element
// with support shadow dom
export default function getActiveElement () {
  // support having the activeElement inside a shadow root
  if (document?.activeElement?.shadowRoot) {
    return document.activeElement.shadowRoot.activeElement
  }

  return document.activeElement
}
