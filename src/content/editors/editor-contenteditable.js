/* ContentEditable
 */

export function isContentEditable (element) {
  return element && element.hasAttribute('contenteditable')
}

// Set the cursor position at the end of the focusNode.
// Used when inserting templates with the dialog,
// and the correct caret position is lost.
function setCursorPosition (container, node) {
    const selection = window.getSelection();
    let focusNode = node;

    // setStart/setEnd work differently based on
    // the type of node
    // https://developer.mozilla.org/en-US/docs/Web/API/range.setStart
    if (!document.body.contains(focusNode)) {
        focusNode = selection.focusNode;
    }

    // TODO BUG error thrown when inserting with the dialog
    // and the focusNode is a element node

    console.log(focusNode.textContent, focusNode.childNodes.length)

    // TODO we probably don't need this anymore
//     if (focusNode.nodeType === document.ELEMENT_NODE) {
//       let focusOffset = selection.focusOffset
//       // when focusNode can have child nodes,
//       // focusOffset is the index in the childNodes collection
//       // of the focus node where the selection ends.
//
//       // TODO we can't use focusOffset here, since it only works for the first level
//       // from then on, it's incorrect as it refers to the top-level focusNode
//
//       // *but* if the focus point is placed after the anchor point,
//       // (when we insert templates with the shortcut, not from the dialog),
//       // the focus point is the first position after (not part of the selection),
//       // therefore focusOffset can be equal to the length of focusNode childNodes.
//       // https://developer.mozilla.org/en-US/docs/Web/API/Selection
//       if (focusOffset === focusNode.childNodes.length) {
//           focusOffset = selection.focusOffset - 1
//       }
//       // select the offset node
//       focusNode = focusNode.childNodes[focusOffset]
//       console.log(focusNode, focusOffset)
//     }

    // focus node can be an element node,
    // but we need a text node in the end.
    while (focusNode.nodeType === document.ELEMENT_NODE) {
        if (focusNode.hasChildNodes()) {
            // when focusNode can have child nodes,
            // focusOffset is the index in the childNodes collection
            // of the focus node where the selection ends.

            // TODO we can't use focusOffset here, since it only works for the first level
            // from then on, it's incorrect as it refers to the top-level focusNode

            // *but* if the focus point is placed after the anchor point,
            // (when we insert templates with the shortcut, not from the dialog),
            // the focus point is the first position after (not part of the selection),
            // therefore focusOffset can be equal to the length of focusNode childNodes.
            // https://developer.mozilla.org/en-US/docs/Web/API/Selection
//             if (focusOffset === focusNode.childNodes.length) {
//                 focusOffset = selection.focusOffset - 1;
//             }
//             console.log(focusOffset, focusNode.childNodes)
//             // select a text node
//             focusNode = focusNode.childNodes[focusOffset];

            // TODO why not just get the last element of the focus node?
            focusNode = focusNode.lastChild
        } else {
            // create an empty text node
            var tempNode = document.createTextNode('');

            // if the focusNode is the same as the container node
            if (focusNode === container) {
                // insert it in the node
                focusNode.appendChild(tempNode);
            } else {
                // or attach it before the node
                focusNode.parentNode.insertBefore(tempNode, focusNode);
            }

            focusNode = tempNode;
        }
        console.log(focusNode)
    }

    const range = selection.getRangeAt(0);
    // restore focus to the correct position,
    // in case we insert templates using the dialog.
    range.setStartAfter(focusNode);
    range.collapse();

    return {
        range: range,
        focusNode: focusNode
    };
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
