/* ProseMirror
 * https://prosemirror.net/
 *
 * Used by: JIRA
 */

import htmlToText from '../utils/html-to-text.js'

export function isProseMirror (element) {
  return element.classList.contains('ProseMirror')
}

export async function insertProseMirrorTemplate (params = {}) {
  // select shortcut
  if (params.word.text === params.quicktext.shortcut) {
    const selection = window.getSelection()
    const range = selection.getRangeAt(0)
    const focusNode = selection.focusNode
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()

    // give it a second to notice the selection change
    await new Promise((resolve) => setTimeout(resolve))
  }

  const plainText = htmlToText(params.text)
  const dt = new DataTransfer()
  dt.setData('text/html', params.text)
  dt.setData('text/plain', plainText)
  const e = new ClipboardEvent('paste', {
    clipboardData: dt,
  })
  params.element.dispatchEvent(e)
}
