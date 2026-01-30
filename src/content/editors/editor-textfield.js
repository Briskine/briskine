/* Textarea and Input
 */

export function isTextfieldEditor (element) {
  return (
    ['input', 'textarea'].includes(element.tagName.toLowerCase())
    && element.readOnly !== true
    && element.type !== 'password'
  )
}

export function insertTextfieldTemplate ({ element, word, template, text }) {
  if (!isTextfieldEditor(element)) {
    return false
  }

  const textfieldValue = element.value
  let cursorOffset = word.end + text.length

  // if the current word matches the shortcut then remove it
  // otherwise skip it (ex: from dialog)
  let wordStart = word.start
  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    // decrease the cursor offset with the removed text length
    cursorOffset = cursorOffset - word.text.length
  } else {
    // don't delete anything in the textarea
    // just add the qt
    wordStart = word.end
  }

  element.value = textfieldValue.substr(0, wordStart) + text + textfieldValue.substr(word.end)

  // set focus at the end of the added template.
  // only supported on inputs of types text, search, URL, tel and password.
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
  try {
    element.setSelectionRange(cursorOffset, cursorOffset)
  } catch {
    // probably unsupported input type
  }

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
    element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })

  return true
}
