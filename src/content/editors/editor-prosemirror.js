/* ProseMirror
 * https://prosemirror.net/
 */

import {insertContentEditableTemplate} from './editor-contenteditable.js'

export function isProseMirror (element) {
  return element.classList.contains('ProseMirror')
}

function hasOnlyAnchorChild (node) {
  if (node.tagName && node.tagName.toLowerCase() === 'a') {
    return true
  }

  if (node.children.length === 1) {
    return hasOnlyAnchorChild(node.children[0])
  }

  return false
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

export function parseProseMirrorContent (content = '') {
  const template = document.createElement('template')
  template.innerHTML = content.trim()

  // prosemirror uses white-space: break-spaces or pre-wrap
  // and interprets the inserted dom fragment similarly to a pre tag,
  // displaying all the whitespace between tags.
  // we need to trim and collapse whitespace similarly to how browsers
  // render content with white-space: normal.
  // https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace

  // prosemirror doesn't add newlines after block-level tags,
  // we need to manually add br's after each.
  Array.from(template.content.querySelectorAll(blockLevelSelector)).forEach((node) => {
    // add br only if we have a next sibling
    // to avoid adding line breaks after the parent node, or after the last block
    if (node.nextSibling) {
      node.after(document.createElement('br'))
    }

    // trim whitespace in all block nodes
    node.innerHTML = node.innerHTML.trim()
  })

  // find all text nodes
  // and collapse all consecutive whitespaces to a single whitespace
  // or remove the text content completely
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  // start from the second node,
  // the first node is the dom fragment.
  while (walker.nextNode()) {
    const collapsedWhitespace = walker.currentNode.nodeValue.replace(/\s+/g, ' ')
    if (collapsedWhitespace.trim()) {
      walker.currentNode.nodeValue = collapsedWhitespace
    } else {
      // remove value completely,
      // in case of whitespace-only text nodes (eg. newlines).
      walker.currentNode.nodeValue = ''
    }
  }

  // HACK workaround for prosemirror bug.
  // when the inserted content is <div><a href="#">anchor</a></div> or <a href="#">anchor</a>
  // prosemirror strips out the anchor tag, and keeps only the anchor text content, becoming <p>anchor</p>.
  // we work around it by prepending a span with a zero-width whitespace char before the parsed template.
  // using only a text node with the zero-width whitespace does not work
  // when the content is an anchor without a (div) container.
  const zeroWidthWhitespace = '\u200b'
  if (hasOnlyAnchorChild(template.content)) {
    const span = document.createElement('span')
    span.textContent = zeroWidthWhitespace
    template.content.prepend(span)
  }

  return template.innerHTML
}

export function insertProseMirrorTemplate (params = {}) {
  const text = parseProseMirrorContent(params.text)
  insertContentEditableTemplate(Object.assign(params, {
      text: text
  }))
}
