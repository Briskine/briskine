/* Quill rich text editor
 * TODO docs v1 - linkedin
 * v2 paste
 * https://quilljs.com/
 */

import htmlToText from '../utils/html-to-text.js'
import getActiveElement from '../active-element.js'
import {request} from '../page/page-parent.js'

export function isQuill (element) {
  return element.classList.contains('ql-editor')
}

export async function pageInsertQuillTemplate (params = {}) {
  // we can't pass the element instance to the page script
  const element = getActiveElement()
  const container = element.closest('.ql-container')
  const quill = container?.__quill

  // select shortcut
  if (params.word.text === params.template.shortcut) {
    const selection = getSelection(element)
    const range = selection.getRangeAt(0)
    const focusNode = selection.focusNode
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()
    element.dispatchEvent(new Event('input', {bubbles: true}))

    // give the editor a second to notice the change
    await new Promise((resolve) => setTimeout(resolve))
  }

  const plainText = htmlToText(params.text)

  if (quill) {
    // TODO quill v1
    const quillRange = quill.getSelection()
    quill.insertText(quillRange.index, plainText)
  } else {
    // TODO quill v2
    const e = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer(),
      // required for draft.js
      bubbles: true,
    })
    // set the data on the event, instead of a separate DataTransfer instance.
    // otherwise Firefox sends an empty DataTransfer object.
    e.clipboardData.setData('text/html', params.text)
    e.clipboardData.setData('text/plain', plainText)
    element.dispatchEvent(e)
  }
}

export function insertQuillTemplate (params = {}) {
  return request('quill-insert', {
    word: params.word,
    text: params.text,
    template: params.template,
  })
}
