/* Quill1 rich text editor.
 * Used by LinkedIn on posts and comments, Gemini.
 * https://quilljs.com/
 */

import getActiveElement from '../utils/active-element.js'
import { request } from '../page/page-parent.js'
import { selectWord } from '../utils/word.js'

function isQuill1 (element) {
  return element?.closest?.('.ql-container')?.__quill
}

export async function pageInsertQuill1Template ({ template, word, html, text }) {
  // we can't pass the element instance to the page script
  const element = getActiveElement()
  if (!isQuill1(element)) {
    return false
  }

  // quill v1 exposes the quill instance on the container.
  // private __quill property can only be accessed in a page script
  const quill = element.closest('.ql-container').__quill

  // remove shortcut
  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    const selectedWordRange = await selectWord(element, word)
    selectedWordRange.deleteContents()
  }

  // use quill instance methods.
  const quillRange = quill.getSelection()

  // when we don't have a default trusted types policy (e.g., Gemini),
  // try to insert html.
  if (!window?.trustedTypes?.defaultPolicy) {
    try {
      quill.clipboard.dangerouslyPasteHTML(quillRange?.index, html)
      return true
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

  return true
}

export function insertQuill1Template ({ word, template, text, html }) {
  return request('quill1-insert', {
    word,
    template,
    text,
    html,
  })
}
