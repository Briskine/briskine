/* Quill rich text editor.
 * Supports v1 (used by LinkedIn on posts and comments) and v2.
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
  // quill v1 exposes the quill instance on the container
  const container = element?.closest?.('.ql-container')
  // private __quill property can only be accessed in a page script
  const quill = container?.__quill

  // remove shortcut
  if (
    params.template.shortcut
    && params.template.shortcut === params.word.text
  ) {
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

  // only support plain text
  const plainText = htmlToText(params.text)

  if (quill) {
    // quill v1
    const quillRange = quill.getSelection()
    if (window?.trustedTypes?.defaultPolicy) {
      // when we have a default trusted types policy (e.g., LinkedIn),
      // only insert plain text,
      // because the template html will most probably include invalid elements.
      // use quill instance methods.
      quill.insertText(quillRange?.index, plainText)
    } else {
      // insert html when trusted types are not used
      quill.clipboard.dangerouslyPasteHTML(quillRange?.index, params.text)
    }
  } else {
    // quill v2,
    // use paste insert.
    // needs to be run in page context,
    // otherwise Firefox won't trigger the event.
    const e = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer(),
      bubbles: true,
    })
    // set the data on the event, instead of a separate DataTransfer instance.
    // otherwise Firefox sends an empty DataTransfer object.
    e.clipboardData.setData('text/plain', plainText)
    e.clipboardData.setData('text/html', params.text)
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
