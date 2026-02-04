import { isContentEditable } from '../editors/editor-contenteditable.js'
import { getSelectionFocus, getSelectionRange, setSelectionRange } from './selection.js'
import debug from '../../debug.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'

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

  if (isContentEditable(element)) {
    const [focusNode, focusOffset] = getSelectionFocus(element)
    switch (focusNode.nodeType) {
      // in most cases, the focusNode property refers to a Text Node.
      case (document.TEXT_NODE):
        // for text nodes take the text until the focusOffset
        beforeSelection = focusNode.textContent.substring(0, focusOffset)
        break
      case (document.ELEMENT_NODE):
        // when we have an element node,
        // focusOffset returns the index in the childNodes collection of the focus node where the selection ends.
        if (
          // focusOffset is larger than childNodes length when editor is empty
          focusNode.childNodes[focusOffset]
        ) {
          beforeSelection = focusNode.childNodes[focusOffset].textContent
        }
        break
    }
  } else {
    // selectionEnd/selectionStart apply only to inputs of types text, search, URL, tel, and password.
    // returns null while accessing them property on non-text input elements (e.g., email).
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/selectionEnd
    let caretIndex = element.selectionEnd
    if (element.selectionDirection === 'backward') {
      caretIndex = element.selectionStart
    }

    if (caretIndex !== null) {
      beforeSelection = element.value.substring(0, caretIndex)
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
  if (isTextfieldEditor(element)) {
    try {
      element.setSelectionRange(word.start, word.end)
    } catch (err) {
      // only supported on inputs of types text, search, URL, tel and password.
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange
      debug(['selectWord', err])
    }

    return
  }

  const range = getSelectionRange(element)
  try {
    const [focusNode] = getSelectionFocus(element, range)

    range.setStart(focusNode, word.start)
    range.setEnd(focusNode, word.end)

    return setSelectionRange(element, range)
  } catch (err) {
    // when the word was removed from the editor before we managed to remove it.
    // this can happen if the editor content changes before we fetch the template.
    debug(['selectWord', err])
  }

  return range
}
