/*
 * Editors with Paste event support.
 *
 * ProseMirror
 * https://prosemirror.net/
 * Used by: JIRA, ChatGPT
 *
 * Draft.js rich text editor framework
 * https://draftjs.org/
 *
 * CKEditor5
 * https://ckeditor.com/ckeditor-5/
 *
 * Quill v2
 * https://quilljs.com/
 *
 * Google Sheets
 * https://docs.google.com/spreadsheets/
 *
 * Google Docs
 * https://docs.google.com/document/
 *
 * Google Slides
 * https://docs.google.com/presentation/
 *
 */

import { getActiveElement } from '../utils/active-element.js'
import createDataTransferEvent from '../utils/data-transfer-event.js'
import { isQuill1 } from './editor-quill1.js'

function isPasteEditor (element) {
  return (
    // prosemirror
    element?.classList?.contains?.('ProseMirror')
    // draft.js
    || element?.querySelector?.('[data-contents]')
    // ckeditor5
    || element?.classList?.contains?.('ck-editor__editable')
    // quill v2
    || (
      element?.classList?.contains?.('ql-editor')
      && !isQuill1(element)
    )

    // google sheets
    || element?.id === 'waffle-rich-text-editor'
    // google docs/slides
    || window?.frameElement?.classList?.contains?.('docs-texteventtarget-iframe')
  )
}

export async function insertPasteTemplate ({ html, text }) {
  const element = getActiveElement()
  if (!isPasteEditor(element)) {
    return false
  }

  const e = createDataTransferEvent({
    constructor: 'ClipboardEvent',
    type: 'paste',
    dataKey: 'clipboardData',
    props: {
      bubbles: true,
    },
    text,
    html,
  })
  element.dispatchEvent(e)

  return true
}
