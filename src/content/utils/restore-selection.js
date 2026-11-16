import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'
import { getSelectionRange, setSelectionRange } from './selection.js'

// the selection of the editor, to restore later.
// the offsets in input and textarea, a range in contenteditable.
export function saveSelection (element) {
  if (isTextfieldEditor(element)) {
    return {
      start: element.selectionStart,
      end: element.selectionEnd,
      direction: element.selectionDirection,
    }
  }

  return getSelectionRange(element)
}

// give focus back to the editor, and restore its selection
export async function restoreSelection (element, selection) {
  element.focus({ preventScroll: true })

  // browsers can move the caret to the start when focusing,
  // e.g. when closing a modal dialog gives focus back.
  if (isTextfieldEditor(element)) {
    // type=email has no selection
    if (Number.isInteger(selection?.start)) {
      element.setSelectionRange(selection.start, selection.end, selection.direction)
    }

    return
  }

  if (!isContentEditable(element)) {
    return
  }

  // the editor changed its content
  const range = element.contains(selection?.commonAncestorContainer) ? selection : null
  if (
    range
    // the range moved to the start when the editor re-created its content
    // (eg. linkedin in shadow dom), or the editor is empty, when focus is enough.
    && !(range.startContainer === element && range.collapsed && range.startOffset === 0)
  ) {
    await setSelectionRange(element, range)
    return
  }

  // focus can come back without a caret,
  // e.g. when closing a modal dialog gives focus back.
  if (!hasCaret(element)) {
    const start = new Range()
    start.setStart(element, 0)
    await setSelectionRange(element, start)
  }
}

function hasCaret (element) {
  const range = getSelectionRange(element)
  return Boolean(range && element.contains(range.startContainer))
}
