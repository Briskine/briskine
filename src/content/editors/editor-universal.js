/* Generic editors
 */

import {isContentEditable, insertContentEditableTemplate} from './editor-contenteditable.js'
import {isCkEditor, insertCkEditorTemplate} from './editor-ckeditor.js'
import {isDraft, insertDraftTemplate} from './editor-draft.js'
import {isLexical, insertLexicalTemplate} from './editor-lexical.js'
import {isSlate, insertSlateTemplate} from './editor-slate.js'
import {isQuill, insertQuillTemplate} from './editor-quill.js'
import {isProseMirror, insertProseMirrorTemplate} from './editor-prosemirror.js'
import {insertTextareaTemplate} from './editor-textarea.js'

export function insertTemplate (params = {}) {
  if (isCkEditor(params.element)) {
    return insertCkEditorTemplate(params)
  }

  if (isDraft(params.element)) {
    return insertDraftTemplate(params)
  }

  if (isLexical(params.element)) {
    return insertLexicalTemplate(params)
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
