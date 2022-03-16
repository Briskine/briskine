/* ProseMirror
 * https://prosemirror.net/
 */

import {insertContentEditableTemplate} from './editor-contenteditable.js'

export function isProseMirror (element) {
  return element.classList.contains('ProseMirror')
}

const blockLevelSelector = [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'figcaption',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul'
].join(',')

function parseProseMirrorContent (content = '') {
  const template = document.createElement('template')
  template.innerHTML = content

  // prosemirror doesn't add newlines after block-level tags,
  // we need to manually add br's after each.
  Array.from(template.content.querySelectorAll(blockLevelSelector)).forEach((node, index, arr) => {
    // don't add a br after the last block element
    if (index !== arr.length - 1) {
      node.after(document.createElement('br'))
    }
  })

  // promsemirror interprets inserted dom fragment similarly to a pre tag
  // and displays all the whitespace between tags.
  // find text nodes and trim all whitespace to work around them.
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  // start from the second node,
  // the first node is the dom fragment.
  while (walker.nextNode()) {
    walker.currentNode.nodeValue = walker.currentNode.nodeValue.trim()
  }

  return template.innerHTML
}

export function insertProseMirrorTemplate (params = {}) {
  const text = parseProseMirrorContent(params.text)
  insertContentEditableTemplate(Object.assign(params, {
      text: text
  }))
}
