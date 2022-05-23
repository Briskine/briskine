/* Lexical editor from Facebook
 * https://lexical.dev/
 */

import htmlToText from '../utils/html-to-text.js';

export function isLexical (element) {
  return element.dataset.lexicalEditor
}

// TODO keyboard completion stopped working in the lexical playground
// templates are removed after being inserted
// TODO dialog insert still works, but templates are one-liners
export function insertLexicalTemplate (params = {}) {
  const selection = window.getSelection()
  const range = selection.getRangeAt(0)
  const focusNode = selection.focusNode

  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()
  }

  // only supports plain text
  const content = htmlToText(params.text)

  // needs an extra newline at the start
  return document.execCommand('insertText', false, `\n${content}`)
}
