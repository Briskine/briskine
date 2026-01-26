/* Editors with beforeinput event support.
 *
 * Slate
 * framework for building rich text editors.
 * https://github.com/ianstormtaylor/slate
 *
 * Lexical editor from Facebook
 * https://lexical.dev/
 */

import { selectWord } from '../word.js'

export function isBeforeInputEditor (element) {
  return (
    element?.hasAttribute?.('data-lexical-editor')
    || element?.hasAttribute?.('data-slate-editor')
  )
}

export async function insertBeforeInputTemplate ({ element, template, word, text}) {
  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    selectWord(element, word)
  }

  // replace selected text
  const insertText = new InputEvent('beforeinput', {
    bubbles: true,
    inputType: 'insertReplacementText',
    // only supports plain text
    data: text,
  })
  element.dispatchEvent(insertText)
}
