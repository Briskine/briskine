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

    // Loom browser extension causes the focusNode to always be an element
    // on certain websites.
    // we need to have a text node in the end
    while (focusNode.nodeType === document.ELEMENT_NODE) {
        if (focusNode.childNodes.length > 0) {
            // when focusNode can have child nodes,
            // focusOffset is the index in the childNodes collection
            // of the focus node where the selection ends.
            let focusOffset = selection.focusOffset;
            // *but* if the focus point is placed after the anchor point,
            // (when we insert templates with the shortcut, not from the dialog),
            // the focus point is the first position after (not part of the selection),
            // therefore focusOffset can be equal to the length of focusNode childNodes.
            if (selection.focusOffset === focusNode.childNodes.length) {
                focusOffset = selection.focusOffset - 1;
            }
            // select a text node
            focusNode = focusNode.childNodes[focusOffset];
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

  // fix issues with the cursor jumping to the next line after inserting a template,
  // in some contenteditable editors (eg. Front).
  // also avoids having to manually edit template html as we suggested previously:
  // https://www.briskine.com/blog/template-inline/
  // TODO do the same with first child, to allow inline insert
  if (templateNode.lastElementChild) {
    // we can't use display: inline-block on the container or last element,
    // because Chrome will hide the caret on new lines (added with Enter right after inserted template),
    // https://bugs.chromium.org/p/chromium/issues/detail?id=896108
    // and Firefox will prevent adding newlines with the Enter key.
    //
    // since tinymce will always add div containers for paragraphs,
    // we replace the container with its contents.
    // this also allows inserting one-liner templates inline.
    templateNode.lastElementChild.replaceWith(...templateNode.lastElementChild.childNodes)
  }

  range.insertNode(templateNode)
  range.collapse()

  // trigger multiple change events,
  // for frameworks and scripts to notice changes to the editable fields.
  Array('input', 'change').forEach((eventType) => {
      params.element.dispatchEvent(new Event(eventType, {bubbles: true}))
  })

  return
}
