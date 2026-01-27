/* Editors with beforeinput event support.
 *
 * Slate
 * framework for building rich text editors.
 * https://github.com/ianstormtaylor/slate
 *
 * Lexical editor from Facebook
 * https://lexical.dev/
 */

import { selectWord } from '../utils/word.js'
import { request } from '../page/page-parent.js'
import getActiveElement from '../utils/active-element.js'

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
    await selectWord(element, word)
  }

  const e = new InputEvent('beforeinput', {
    bubbles: true,
    inputType: 'insertReplacementText',
    dataTransfer: new DataTransfer(),
  })
  // set the data on the event, instead of a separate DataTransfer instance.
  // otherwise Firefox sends an empty DataTransfer object.
  // also needs to run in page context, for firefox support.
  e.dataTransfer.setData('text/plain', text)
  e.dataTransfer.setData('text/html', html)
  element.dispatchEvent(e)
}
