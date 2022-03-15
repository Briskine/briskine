/* Lexical editor from Facebook
 * https://lexical.dev/
 */

import {htmlToText} from '../utils/plain-text.js';

export function isLexical (element) {
  return element.dataset.lexicalEditor
}

export function insertLexicalText (params = {}) {
  params.element.focus()

  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    const range = window.getSelection().getRangeAt(0)
    range.setStart(params.focusNode, params.word.start)
    range.setEnd(params.focusNode, params.word.end)
    range.deleteContents()
  }

  // only supports plain text
  const content = htmlToText(params.text)

  // needs an extra newline at the start
  return document.execCommand('insertText', false, `\n${content}`)
}
