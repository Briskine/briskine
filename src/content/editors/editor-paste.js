/*
 * Editors with Paste event support.
 *
 * ProseMirror
 * https://prosemirror.net/
 * Used by: JIRA
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
 * LinkedIn Message Editor
 *
 */

import { request } from '../page/page-parent.js'
import { selectWord } from '../utils/word.js'
import getActiveElement from '../utils/active-element.js'

function isPasteEditor (element) {
  return (
    // prosemirror
    element?.classList?.contains?.('ProseMirror')
    // draft.js
    || element?.querySelector?.('[data-contents]')
    // linkedin message editor
    || element?.classList?.contains?.('msg-form__contenteditable')
    // ckeditor5
    || element?.classList?.contains?.('ck-editor__editable')
    // quill v2
    || (
      element?.classList?.contains?.('ql-editor')
      && !element?.closest?.('.ql-container')?.__quill
    )
  )
}

export function insertPasteTemplate ({ word, template, html, text }) {
  return request('paste-insert', {
    word,
    template,
    html,
    text,
  })
}

// runs in page context,
// otherwise Firefox won't trigger the event.
export async function pageInsertPasteTemplate ({ word, template, html, text }) {
  // we can't pass the element instance to the page script
  const element = getActiveElement()
  if (!isPasteEditor(element)) {
    return false
  }

  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    await selectWord(element, word)
  }

  const e = new ClipboardEvent('paste', {
    clipboardData: new DataTransfer(),
    bubbles: true,
  })
  // set the data on the event, instead of a separate DataTransfer instance.
  // otherwise Firefox sends an empty DataTransfer object.
  // also needs to run in page context, for firefox support.
  e.clipboardData.setData('text/plain', text)
  e.clipboardData.setData('text/html', html)
  element.dispatchEvent(e)

  return true
}
