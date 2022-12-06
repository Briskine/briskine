/* ContentEditable
 */

import {getSelection} from '../autocomplete.js'

export function isContentEditable (element) {
  return element && element.hasAttribute('contenteditable')
}

export function insertContentEditableTemplate (params = {}) {
  const selection = getSelection(params.element)
  // run operations on a cloned range, rather than the original range,
  // to fix issues with not correctly positioning the cursor on Safari.
  // using range.insertNode() doesn't select the inserted contents, *only on Safari*.
  // the range object will mistakenly behave as if the contents are selected,
  // while the selection object will reflect the real state.
  // using a cloned range fixes the issue.
  const range = selection.getRangeAt(0).cloneRange()

  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    range.setStart(selection.focusNode, params.word.start)
    range.setEnd(selection.focusNode, params.word.end)
  }

  // always delete the selected text
  range.deleteContents()

  const templateNode = range.createContextualFragment(params.text)
  range.insertNode(templateNode)
  range.collapse()

  selection.removeAllRanges()
  selection.addRange(range)

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
      params.element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })

  return
}
