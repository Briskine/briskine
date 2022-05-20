/* ContentEditable
 */

export function isContentEditable (element) {
  return element && element.hasAttribute('contenteditable')
}

// Set the cursor position at the end of the focusNode.
// Used when inserting templates with the dialog,
// and the correct caret position is lost.
function setCursorPosition (container, node) {
  const selection = window.getSelection()
  let focusNode = node

  if (!document.body.contains(focusNode)) {
    focusNode = selection.focusNode
  }

  // focus node can be an element node,
  // but we want a text node in the end,
  // to have consistent rage manipulation.
  // setStart/setEnd work differently depending on node type.
  // https://developer.mozilla.org/en-US/docs/Web/API/range.setStart
  console.log(focusNode)
  while (focusNode.nodeType === document.ELEMENT_NODE) {
    if (focusNode.hasChildNodes()) {
      focusNode = focusNode.lastChild
    } else {
      // create an empty text node
      const textNode = document.createTextNode('')

      // if the focusNode is the same as the container node
      if (focusNode === container) {
        // insert it in the node
        focusNode.appendChild(textNode)
      } else {
        // or attach it before the node
//         focusNode.parentNode.insertBefore(tempNode, focusNode)
        focusNode.before(textNode)
      }

      focusNode = textNode
    }
    console.log(focusNode)
  }

  const range = selection.getRangeAt(0)
  // restore focus to the correct position,
  // in case we insert templates using the dialog.
  range.setStartAfter(focusNode)
  range.collapse()

  return {
    range: range,
    focusNode: focusNode
  }
}

export function insertContentEditableTemplate (params = {}) {
  // restore focus to the editable area
  params.element.focus()

  const {range, focusNode} = setCursorPosition(params.element, params.focusNode)

  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()
  }

  const templateNode = range.createContextualFragment(params.text)
  range.insertNode(templateNode)
  range.collapse()

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
      params.element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })

  return
}
