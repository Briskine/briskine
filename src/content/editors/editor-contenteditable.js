/* ContentEditable
 */

import getComposedSelection from '../selection.js'

export function isContentEditable (element) {
  return element?.isContentEditable
}

export function insertContentEditableTemplate ({ element, template, word, html }) {
  const selection = getComposedSelection(element)
  // run operations on a cloned range, rather than the original range,
  // to fix issues with not correctly positioning the cursor on Safari.
  // using range.insertNode() doesn't select the inserted contents, *only on Safari*.
  // the range object will mistakenly behave as if the contents are selected,
  // while the selection object will reflect the real state.
  // using a cloned range fixes the issue.
  let range = selection.getRangeAt(0).cloneRange()

  if (
    template.shortcut
    && word.text === template.shortcut
  ) {
    // delete matched shortcut
    range.setStart(selection.focusNode, word.start)
    range.setEnd(selection.focusNode, word.end)
    range.deleteContents()
  } else {
    // delete previous selection, if no shortcut match.
    // we're most probably inserting from the dialog.
    range.deleteContents()

    // empty paragraphs usually contain a BR tag in contenteditable,
    // which is replaced by text nodes if we type anything inside the line.
    // if we insert text on a blank line, containing a BR (eg. when inserting from the dialog),
    // we'll get an extra newline after the template.
    // even if technically correct, this can look unexpected and we'd prefer the empty line
    // to be replaced with the template (instead of the template being prepended before it).

    // detect if we're on an empty line containing only whitespace
    if (
      selection.anchorNode.nodeType === document.ELEMENT_NODE &&
      selection.focusNode === selection.anchorNode &&
      selection.focusNode.innerText.trim() === ''
    ) {
      // select all nodes on the line
      selection.setBaseAndExtent(selection.anchorNode, 0, selection.focusNode, selection.focusNode.childNodes.length)
      // get an updated range reference
      range = selection.getRangeAt(0).cloneRange()
      // delete all child nodes
      range.deleteContents()
    }
  }

  const templateNode = range.createContextualFragment(html)
  range.insertNode(templateNode)
  range.collapse()

  selection.removeAllRanges()
  selection.addRange(range)

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
    element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })
}
