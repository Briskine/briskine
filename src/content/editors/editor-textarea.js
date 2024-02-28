/* Generic editors
 */

import htmlToText from '../utils/html-to-text.js'

export function insertTextareaTemplate (params = {}) {
  // restore focus to the editable area
  params.element.focus()

  // convert html to text for textfields
  const content = htmlToText(params.text)
  const textfieldValue = params.element.value
  let cursorOffset = params.word.end + content.length

  // if the current word matches the shortcut then remove it
  // otherwise skip it (ex: from dialog)
  let wordStart = params.word.start
  if (params.word.text === params.quicktext.shortcut) {
    // decrease the cursor offset with the removed text length
    cursorOffset = cursorOffset - params.word.text.length
  } else {
    // don't delete anything in the textarea
    // just add the qt
    wordStart = params.word.end
  }

  params.element.value = textfieldValue.substr(0, wordStart) + content + textfieldValue.substr(params.word.end)

  // set focus at the end of the added template.
  // only supported on inputs of types text, search, URL, tel and password.
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
  try {
    params.element.setSelectionRange(cursorOffset, cursorOffset)
  } catch (err) {
    // probably unsupported input type
  }

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
      params.element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })

  return
}
