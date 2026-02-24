/* Textarea and Input
 */

import { getActiveElement } from '../utils/active-element.js'

export function isTextfieldEditor (element) {
  return (
    element
    && element.nodeType === Node.ELEMENT_NODE
    && element.readOnly !== true
    && (
      element.tagName.toLowerCase() === 'textarea'
      || (
        element.tagName.toLowerCase() === 'input'
        && element.type !== 'password'
        // only editable input types where can use selection methods and properties
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
        // https://html.spec.whatwg.org/multipage/input.html#do-not-apply
        && (
          element.selectionStart !== null
          // but still support type=email
          || element.type === 'email'
        )
      )
    )
  )
}

export function insertTextfieldTemplate ({ text }) {
  const element = getActiveElement()
  if (!isTextfieldEditor(element)) {
    return false
  }

  // respect maxlength
  if (element.maxLength > 0) {
    const currentLength = element.value.length
    let selectionLength = 0
    // support type=email, where selectionStart=null
    if (element.selectionStart !== null) {
      selectionLength = element.selectionEnd - element.selectionStart
    }
    const remainingChars = element.maxLength - (currentLength - selectionLength)
    // use max in case the selection is somehow already over limit
    text = text.slice(0, Math.max(0, remainingChars))
  }

  if (element.selectionStart !== null) {
    element.setRangeText(text, element.selectionStart, element.selectionEnd, 'end')
  } else {
    // to support type=email, we'll consider the caret placed at the end,
    // since we can't know where it really is.
    element.value = element.value + text
  }

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
    element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })

  return true
}
