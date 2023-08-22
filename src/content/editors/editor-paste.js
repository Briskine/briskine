/* Editors with Paste event support.
 *
 * Draft.js rich text editor framework
 * https://draftjs.org/
 *
 */

import htmlToText from '../utils/html-to-text.js'

export function isPasteEditor (element) {
  return element.querySelector('[data-contents]')
}

export function insertPasteTemplate (params = {}) {
  const selection = window.getSelection()
  const range = selection.getRangeAt(0)
  const focusNode = selection.focusNode

  let removeShortcut = Promise.resolve()

  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()
    params.element.dispatchEvent(new Event('input', {bubbles: true}))

    // lexical needs a second to update the editor state
    removeShortcut = new Promise((resolve) => setTimeout(resolve, 100))
  }

  removeShortcut.then(() => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/plain', htmlToText(params.text))
    const customPasteEvent = new ClipboardEvent('paste', {
      clipboardData: clipboardData,
      bubbles: true,
    })
    params.element.dispatchEvent(customPasteEvent)
    clipboardData.clearData()
  })
}
