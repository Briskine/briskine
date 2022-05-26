/* Generic editors
 */

import {isContentEditable, insertContentEditableTemplate} from './editor-contenteditable.js'
import {isCkEditor, insertCkEditorTemplate} from './editor-ckeditor.js'
import {isPasteEditor, insertPasteTemplate} from './editor-paste.js'
import {isSlate, insertSlateTemplate} from './editor-slate.js'
import {isQuill, insertQuillTemplate} from './editor-quill.js'
import {isProseMirror, insertProseMirrorTemplate} from './editor-prosemirror.js'
import {insertTextareaTemplate} from './editor-textarea.js'

export function insertTemplate (params = {}) {
  if (isCkEditor(params.element)) {
    return insertCkEditorTemplate(params)
  }

  if (isPasteEditor(params.element)) {
    return insertPasteTemplate(params)
  }

  if (isSlate(params.element)) {
    return insertSlateTemplate(params)
  }

  if (isQuill(params.element)) {
    return insertQuillTemplate(params)
  }

  if (isProseMirror(params.element)) {
    return insertProseMirrorTemplate(params)
  }

  if (isContentEditable(params.element)) {
    return insertContentEditableTemplate(params)
  }

  return insertTextareaTemplate(params)
}
