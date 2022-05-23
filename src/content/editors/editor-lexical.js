/* Lexical editor from Facebook
 * https://lexical.dev/
 */

export function isLexical (element) {
  return element.dataset.lexicalEditor
}

export function insertLexicalTemplate (params = {}) {
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
    clipboardData.setData('text/html', params.text)
    const customPasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData,
        bubbles: true,
    })
    params.element.dispatchEvent(customPasteEvent)
    clipboardData.clearData()
  })
}
