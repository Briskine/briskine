/*
 * ExecCommand, used as fallback
 */

import { selectWord } from '../utils/word.js'
import debug from '../../debug.js'
import { isContentEditable } from './editor-contenteditable.js'

function minifyHtml (html) {
  // minifying the html makes execCommand(insertHTML) behave closer to how the
  // browser parses html, and how the contenteditable-editor works.
  // otherwise a lot of the whitespace in the original html will end up
  // creating empty containers in the editor, or acting like pre in element nodes.
  const range = new Range()
  const fragment = range.createContextualFragment(html)
  return Array.from(fragment.childNodes)
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim()
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.innerHTML = node.innerHTML.trim()
        return node.outerHTML
      }

      // ignore comment and other types of nodes
      return ''
    })
    .join('')
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
