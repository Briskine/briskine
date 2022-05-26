/* Draft.js rich text editor framework
 * https://draftjs.org/
 */

import htmlToText from '../utils/html-to-text.js'

export function isDraft (element) {
  return element.querySelector('[data-contents]')
}

export function insertDraftTemplate (params = {}) {
  const selection = window.getSelection()
  const range = selection.getRangeAt(0)
  const focusNode = selection.focusNode

  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()
    params.element.dispatchEvent(new Event('input', {bubbles: true}))
  }

  const clipboardData = new DataTransfer()
  clipboardData.setData('text/plain', htmlToText(params.text))
  const customPasteEvent = new ClipboardEvent('paste', {
      clipboardData: clipboardData,
      bubbles: true,
  })
  params.element.dispatchEvent(customPasteEvent)
  return clipboardData.clearData()
}
