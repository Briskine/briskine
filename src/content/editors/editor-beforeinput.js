/* Editors with beforeinput event support.
 *
 * Slate
 * framework for building rich text editors.
 * https://github.com/ianstormtaylor/slate
 *
 * Lexical editor from Facebook
 * https://lexical.dev/
 */

import htmlToText from '../utils/html-to-text.js'
import {getSelection} from '../autocomplete.js'

export function isBeforeInputEditor (element) {
  return element.hasAttribute('data-lexical-editor') || element.hasAttribute('data-slate-editor')
}

export async function insertBeforeInputTemplate (params = {}) {
  params.element.focus()

  // Slate uses onbeforeinput exclusively, and does not notice content inserted from outside.
  // https://docs.slatejs.org/concepts/xx-migrating#beforeinput
  // Use the beforeinput-specific method to insert and remove text,
  // using custom synthetic beforeinput events.
  // Slate and Lexical handle beforeinput events with stadard inputType's
  // https://github.com/ianstormtaylor/slate/blob/16ff44d0566889a843a346215d3fb7621fc0ed8c/packages/slate-react/src/components/editable.tsx#L193
  if (params.word.text === params.quicktext.shortcut) {
    // select the shortcut
    const selection = getSelection(params.element)
    const range = selection.getRangeAt(0)
    range.setStart(selection.focusNode, params.word.start)
    range.setEnd(selection.focusNode, params.word.end)

    // slate needs a second to notice the new selection
    await new Promise((resolve) => setTimeout(resolve))
  }

  // only supports plain text
  const content = htmlToText(params.text)
  // replace selected text
  const insertText = new InputEvent('beforeinput', {
    bubbles: true,
    inputType: 'insertReplacementText',
    data: content
  })
  params.element.dispatchEvent(insertText)
}
