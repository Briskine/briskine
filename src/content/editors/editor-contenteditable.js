/* ContentEditable
 */

import { getSelectionFocus, getSelectionRange, setSelectionRange } from '../utils/selection.js'

export function isContentEditable (element) {
  return element?.isContentEditable
}

export function insertContentEditableTemplate ({ element, template, word, html, text }) {
  const range = getSelectionRange(element)

  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    // delete matched shortcut
    const [focusNode] = getSelectionFocus(element, range)
    range.setStart(focusNode, word.start)
    range.setEnd(focusNode, word.end)
    range.deleteContents()
  } else {
    // delete previous selection, if no shortcut match.
    range.deleteContents()

    // empty paragraphs usually contain a BR tag in contenteditable,
    // which is replaced by text nodes if we type anything inside the line.
    // if we insert text on a blank line, containing a BR (eg. when inserting from the dialog),
    // we'll get an extra newline after the template.
    // even if technically correct, this can look unexpected and we'd prefer the empty line
    // to be replaced with the template (instead of the template being prepended before it).

    // detect if we're on an empty line containing only whitespace
    if (
      range.collapsed === true
      && range.endContainer.nodeType === document.ELEMENT_NODE
      && range.endContainer.innerText.trim() === ''
    ) {
      // select all nodes on the line
      range.selectNodeContents(range.endContainer)
      // delete all child nodes
      range.deleteContents()
    }
  }

  let templateNode
  try {
    templateNode = range.createContextualFragment(html)
  } catch {
    templateNode = range.createContextualFragment(text)
  }

  range.insertNode(templateNode)
  range.collapse()

  setSelectionRange(element, range)

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
    element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })
}
