/* Editors with Paste event support.
 *
 * ProseMirror
 * https://prosemirror.net/
 * Used by: JIRA
 *
 * Draft.js rich text editor framework
 * https://draftjs.org/
 *
 * LinkedIn message editor
 *
 */

import htmlToText from '../utils/html-to-text.js'
import {request} from '../page/page-parent.js'
import { getSelection } from '../selection.js'
import getActiveElement from '../active-element.js'

export function isPasteEditor (element) {
  return (
    // prosemirror
    element.classList.contains('ProseMirror')
    // draft.js
    || element.querySelector('[data-contents]')
    // linkedin message editor
    || element.classList.contains('msg-form__contenteditable')
  )
}

export function insertPasteTemplate (params = {}) {
  return request('paste-insert', {
    word: params.word,
    template: params.template,
    text: params.text,
  })
}

// runs in page context,
// otherwise Firefox won't trigger the event.
export async function pageInsertPasteTemplate (params = {}) {
  // we can't pass the element instance to the page script
  const element = getActiveElement()
  // select shortcut
  if (params.word.text === params.template.shortcut) {
    const selection = getSelection(element)
    const range = selection.getRangeAt(0)
    const focusNode = selection.focusNode
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    // required for correct caret placement at the end in JIRA
    range.deleteContents()
    // required for draft.js
    element.dispatchEvent(new Event('input', {bubbles: true}))

    // give the editor a second to notice the change
    await new Promise((resolve) => setTimeout(resolve))
  }

  const plainText = htmlToText(params.text)
  const e = new ClipboardEvent('paste', {
    clipboardData: new DataTransfer(),
    // required for draft.js
    bubbles: true,
  })
  // set the data on the event, instead of a separate DataTransfer instance.
  // otherwise Firefox sends an empty DataTransfer object.
  e.clipboardData.setData('text/plain', plainText)
  e.clipboardData.setData('text/html', params.text)
  element.dispatchEvent(e)
}
