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
import { request } from '../page/page-parent.js'
import getActiveElement from '../active-element.js'

export function isBeforeInputEditor (element) {
  return (
    element?.hasAttribute?.('data-lexical-editor')
    || element?.hasAttribute?.('data-slate-editor')
  )
}

export function insertBeforeInputTemplate ({ word, template, html, text }) {
  return request('beforeinput-insert', {
    word,
    template,
    html,
    text,
  })
}

export async function pageInsertBeforeInputTemplate ({ template, word, text, html}) {
  const element = getActiveElement()

  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    selectWord(element, word)
  }

  // needs to be run in page context, for firefox support
  const insertTextEvent = new InputEvent('beforeinput', {
    bubbles: true,
    inputType: 'insertReplacementText',
    dataTransfer: new DataTransfer(),
  })

  insertTextEvent.dataTransfer.setData('text/plain', text)
  insertTextEvent.dataTransfer.setData('text/html', html)

  element.dispatchEvent(insertTextEvent)
}
