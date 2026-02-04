/* Textarea and Input
 */

import { selectWord } from '../utils/word.js'

// only editable input types where can use selection methods and properties
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
const validInputTypes = [
  'text',
  'search',
  'tel',
  'url',
]

export function isTextfieldEditor (element) {
  return (
    element.readOnly !== true
    && (
      element.tagName.toLowerCase() === 'textarea'
      || (
        element.tagName.toLowerCase() === 'input'
        && validInputTypes.includes(element.type)
      )
    )
  )
}

export function insertTextfieldTemplate ({ element, word, template, text }) {
  if (!isTextfieldEditor(element)) {
    return false
  }

  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    selectWord(element, word)
  }

  // respect maxlength
  if (element.maxLength > 0) {
    const currentLength = element.value.length
    const selectionLength = element.selectionEnd - element.selectionStart
    const remainingChars = element.maxLength - (currentLength - selectionLength)
    // use max in case the selection is somehow already over limit
    text = text.slice(0, Math.max(0, remainingChars))
  }

  element.setRangeText(text, element.selectionStart, element.selectionEnd, 'end')

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
    element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })

  return true
}
