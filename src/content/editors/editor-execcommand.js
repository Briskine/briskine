/*
 * ExecCommand, used as fallback
 */

import debug from '../../debug.js'
import { isContentEditable } from './editor-contenteditable.js'
import getActiveElement from '../utils/active-element.js'

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

// firefox-compatible execCommand('insertText')
// in contrast with other browser, when using insertText, firefox turns newlines
// into br tags. other browsers turn each line into a separate paragraph (p or div).
// this causes issues with some editors (e.g., linkedin message editor).
// this method makes sure firefox has the same behavior as others.
function insertText (text) {
  // only true in firefox
  if (document.queryCommandSupported('enableObjectResizing')) {
    // insert each line separately
    return text
      .split('\n')
      .reduce((exec, line, index, lines) => {
        if (line) {
          exec = document.execCommand('insertText', false, line)
        }
        // force line break, if not the last line
        if (index < lines.length - 1) {
          exec = document.execCommand('insertParagraph', false)
        }

        return exec
      }, true)
  }

  return document.execCommand('insertText', false, text)
}

export async function insertExecCommandTemplate ({ html, text }) {
  const element = getActiveElement()
  if (
    isContentEditable(element)
    && html !== text
    && element.contentEditable !== 'plaintext-only'
  ) {
    try {
      return document.execCommand('insertHTML', false, minifyHtml(html))
    } catch (err) {
      debug(['insertExecCommandTemplate', err])
    }
  }

  return insertText(text)
}
