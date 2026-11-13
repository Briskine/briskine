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

  if (
    !isContentEditable(element)
    || !selection
    // the editor changed its content
    || !element.contains(selection.commonAncestorContainer)
    // the range moved to the start when the editor re-created its content
    // (eg. linkedin in shadow dom), or the editor is empty, when focus is enough.
    || (selection.startContainer === element && selection.collapsed && selection.startOffset === 0)
  ) {
    return
  }

  await setSelectionRange(element, selection)
}
