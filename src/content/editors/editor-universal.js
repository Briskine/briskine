/* Generic editors
 */

import {isContentEditable, insertContentEditableTemplate} from './editor-contenteditable.js'
import {isCkEditor, insertCkEditorTemplate} from './editor-ckeditor.js'
import {isPasteEditor, insertPasteTemplate} from './editor-paste.js'
import {isBeforeInputEditor, insertBeforeInputTemplate} from './editor-beforeinput.js'
import {isQuill, insertQuillTemplate} from './editor-quill.js'
import {insertTextareaTemplate} from './editor-textarea.js'

export function insertTemplate (params = {}) {
  if (isCkEditor(params.element)) {
    return insertCkEditorTemplate(params)
  }

  if (isPasteEditor(params.element)) {
    return insertPasteTemplate(params)
  }

  if (isBeforeInputEditor(params.element)) {
    return insertBeforeInputTemplate(params)
  }

  if (isQuill(params.element)) {
    return insertQuillTemplate(params)
  }

  if (isContentEditable(params.element)) {
    return insertContentEditableTemplate(params)
  }

  return insertTextareaTemplate(params)
}
