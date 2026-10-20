import { isContentEditable } from '../editors/editor-contenteditable.js'
import { setSelectionRange } from './selection.js'

// give focus back to the editor, and restore its selection
export default async function restoreSelection (element, range) {
  element.focus({ preventScroll: true })

  if (
    !isContentEditable(element)
    || !range
    // the editor changed its content
    || !element.contains(range.commonAncestorContainer)
    // the range moved to the start when the editor re-created its content
    // (eg. linkedin in shadow dom), or the editor is empty, when focus is enough.
    || (range.startContainer === element && range.collapsed && range.startOffset === 0)
  ) {
    return
  }

  await setSelectionRange(element, range)
}
