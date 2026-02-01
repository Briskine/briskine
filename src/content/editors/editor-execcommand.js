/*
 * ExecCommand, used as fallback
 */

import { selectWord } from '../utils/word.js'
import debug from '../../debug.js'
import { isContentEditable } from './editor-contenteditable.js'

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
      document?.execCommand?.('insertHTML', false, html)
    } catch (err) {
      document?.execCommand?.('insertText', false, text)
      debug(['insertExecCommandTemplate', err])
    }

    return true
  }

  document?.execCommand?.('insertText', false, text)

  return true
}
