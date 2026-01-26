import {isContentEditable} from './editors/editor-contenteditable.js'
import getComposedSelection from './selection.js'

// all regular and special whitespace chars we want to find.
// https://jkorpela.fi/chars/spaces.html
// we can't use regex \S to match the first non-whitespace character,
// because it also considers special chars like zero-width-whitespace as non-whitespace.
const spaces = [
  '\n', //newline
  '\u0020', // space
  '\u00A0', // no-break space
  '\u200B', // zero width whitespace
  '\uFEFF', // zero width no-break space
]

// gets the word before the cursor
// and its start and end positions
export function getWord (element) {
  let beforeSelection = ''
  const selection = getComposedSelection(element)

  if (isContentEditable(element)) {
    switch (selection.focusNode.nodeType) {
      // In most cases, the focusNode property refers to a Text Node.
      case (document.TEXT_NODE):
        // for text nodes take the text until the focusOffset
        beforeSelection = selection.focusNode.textContent.substring(0, selection.focusOffset)
        break
      case (document.ELEMENT_NODE):
        // when we have an element node,
        // focusOffset returns the index in the childNodes collection of the focus node where the selection ends.
        if (
          // focusOffset is larger than childNodes length when editor is empty
          selection.focusNode.childNodes[selection.focusOffset]
        ) {
          beforeSelection = selection.focusNode.childNodes[selection.focusOffset].textContent
        }
        break
    }
  } else {
    // selectionEnd property applies only to inputs of types text, search, URL, tel, and password.
    // returns null while accessing selectionEnd property on non-text input elements (e.g., email).
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/selectionEnd
    if (element.selectionEnd !== null) {
      beforeSelection = element.value.substring(0, element.selectionEnd)
    } else {
      beforeSelection = element.value
    }
  }

  // will return -1 from lastIndexOf,
  // if no whitespace is present before the word.
  const lastWhitespace = Math.max(...spaces.map((char) => beforeSelection.lastIndexOf(char)))

  // first character is one index away from the last whitespace
  const start = 1 + lastWhitespace
  const text = beforeSelection.substring(start)
  const end = start + text.length

  return {
    start: start,
    end: end,
    text: text,
  }
}

export function selectWord (element, word) {
  const selection = getComposedSelection(element)
  const range = selection.getRangeAt(0)
  range.setStart(selection.focusNode, word.start)
  range.setEnd(selection.focusNode, word.end)

  element.dispatchEvent(new Event('selectionchange', {bubbles: true}))

  return range
}
