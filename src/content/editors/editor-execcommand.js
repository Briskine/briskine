/*
 * ExecCommand, used as fallback
 */

import { selectWord } from '../utils/word.js'
import debug from '../../debug.js'
import { isContentEditable } from './editor-contenteditable.js'

function minifyHtml (html) {
  return html
    // line breaks and tabs
    .replace(/[\r\n\t]+/g, '')
    // whitespace between tags
    .replace(/>\s+</g, '><')
    // leading/trailing whitespace
    .trim()
}

export async function insertExecCommandTemplate ({ element, template, word, html, text }) {
  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    // delete matched shortcut
    await selectWord(element, word)
  }

  if (
    isContentEditable(element)
    && html !== text
  ) {
    try {
      // minifying the html makes it behave closer to how the
      // contenteditable-editor behaves.
      // otherwise a lot of the whitespace in the original html will end up
      // creating empty containers in the editor.
      document?.execCommand?.('insertHTML', false, minifyHtml(html))
    } catch (err) {
      document?.execCommand?.('insertText', false, text)
      debug(['insertExecCommandTemplate', err])
    }

    return true
  }

  document?.execCommand?.('insertText', false, text)

  return true
}
