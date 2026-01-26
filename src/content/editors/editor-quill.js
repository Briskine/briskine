/* Quill rich text editor.
 * Supports v1 (used by LinkedIn on posts and comments, Gemini) and v2.
 * https://quilljs.com/
 */

import getActiveElement from '../active-element.js'
import { request } from '../page/page-parent.js'
import getComposedSelection from '../selection.js'

export function isQuill (element) {
  return element?.classList?.contains?.('ql-editor')
}

export async function pageInsertQuillTemplate ({ template, word, html, text }) {
  // we can't pass the element instance to the page script
  const element = getActiveElement()
  // quill v1 exposes the quill instance on the container
  const container = element?.closest?.('.ql-container')
  // private __quill property can only be accessed in a page script
  const quill = container?.__quill

  // remove shortcut
  if (
    template.shortcut
    && template.shortcut === word.text
  ) {
    const selection = getComposedSelection(element)
    const range = selection.getRangeAt(0)
    const focusNode = selection.focusNode
    range.setStart(focusNode, word.start)
    range.setEnd(focusNode, word.end)
    range.deleteContents()
    element.dispatchEvent(new Event('input', {bubbles: true}))

    // give the editor a second to notice the change
    await new Promise((resolve) => setTimeout(resolve))
  }

  if (quill) {
    // quill v1,
    // use quill instance methods.
    const quillRange = quill.getSelection()

    // when we don't have a default trusted types policy (e.g., Gemini),
    // try to insert html.
    if (!window?.trustedTypes?.defaultPolicy) {
      try {
        quill.clipboard.dangerouslyPasteHTML(quillRange?.index, html)
        return
      } catch {
        // if we catch an error (could be caused by trusted types only in the editor - e.g., Gemini),
        // insert plain text.
        // we can't catch the dangerouslyPasteHTML error on LinkedIn.
      }
    }

    // when we have a default trusted types policy (e.g., LinkedIn),
    // or when pasting html fails,
    // only insert plain text,
    // because the template html will most probably include invalid elements.
    quill.insertText(quillRange?.index, text)
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
    e.clipboardData.setData('text/plain', text)
    e.clipboardData.setData('text/html', html)
    element.dispatchEvent(e)
  }
}

export function insertQuillTemplate ({ word, template, text, html }) {
  return request('quill-insert', {
    word,
    template,
    text,
    html,
  })
}
