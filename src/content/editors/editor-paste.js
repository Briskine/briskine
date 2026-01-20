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

import {request} from '../page/page-parent.js'
import getComposedSelection from '../selection.js'
import getActiveElement from '../active-element.js'

export function isPasteEditor (element) {
  return (
    // prosemirror
    element?.classList?.contains?.('ProseMirror')
    // draft.js
    || element?.querySelector?.('[data-contents]')
    // linkedin message editor
    || element?.classList?.contains?.('msg-form__contenteditable')
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
  // select shortcut
  if (word.text === template.shortcut) {
    const selection = getComposedSelection(element)
    const range = selection.getRangeAt(0)
    const focusNode = selection.focusNode
    range.setStart(focusNode, word.start)
    range.setEnd(focusNode, word.end)
    // required for correct caret placement at the end in JIRA
    range.deleteContents()
    // required for draft.js
    element.dispatchEvent(new Event('input', {bubbles: true}))

    // give the editor a second to notice the change
    await new Promise((resolve) => setTimeout(resolve))
  }

  const e = new ClipboardEvent('paste', {
    clipboardData: new DataTransfer(),
    // required for draft.js
    bubbles: true,
  })
  // set the data on the event, instead of a separate DataTransfer instance.
  // otherwise Firefox sends an empty DataTransfer object.
  e.clipboardData.setData('text/plain', text)
  e.clipboardData.setData('text/html', html)
  element.dispatchEvent(e)
}
