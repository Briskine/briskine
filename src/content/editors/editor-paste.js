/* Editors with Paste event support.
 *
 * ProseMirror
 * https://prosemirror.net/
 * Used by: JIRA
 *
 * Draft.js rich text editor framework
 * https://draftjs.org/
 *
 */

import htmlToText from '../utils/html-to-text.js'

export function isPasteEditor (element) {
  return (
    // prosemirror
    element.classList.contains('ProseMirror')
    // draft.js
    || element.querySelector('[data-contents]')
  )
}

export async function insertPasteTemplate (params = {}) {
  // select shortcut
  if (params.word.text === params.quicktext.shortcut) {
    const selection = window.getSelection()
    const range = selection.getRangeAt(0)
    const focusNode = selection.focusNode
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    // required for correct caret placement at the end in JIRA
    range.deleteContents()
    // required for draft.js
    params.element.dispatchEvent(new Event('input', {bubbles: true}))

    // give the editor a second to notice the change
    await new Promise((resolve) => setTimeout(resolve))
  }

  const plainText = htmlToText(params.text)
  const clipboardData = new DataTransfer()
  clipboardData.setData('text/html', params.text)
  clipboardData.setData('text/plain', plainText)
  const e = new ClipboardEvent('paste', {
    clipboardData: clipboardData,
    // required for draft.js
    bubbles: true,
  })
  params.element.dispatchEvent(e)
  clipboardData.clearData()
}
