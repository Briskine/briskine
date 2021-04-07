/* global InputEvent */
/* Slate
 * framework for building rich text editors.
 * https://github.com/ianstormtaylor/slate
 */

import {htmlToText} from './plain-text';

export function isSlate (element) {
    return element.dataset.slateEditor;
}

export function insertSlateText (params = {}) {
    params.element.focus();

    // TODO required for restoring the cursor at the correct position
    // after opening the dialog
    // TODO BUG can't insert templates with the dialog
    const selection = window.getSelection();
    let focusNode = params.focusNode;

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

            // if the focusNode is the same as the element
            if (focusNode === params.element) {
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

    // Slate uses onbeforeinput exclusively, and does not notice content inserted from outside.
    // https://docs.slatejs.org/concepts/xx-migrating#beforeinput
    // Use the Slate-specific method to insert and remove text,
    // using custom synthetic beforeinput events.
    // The inputType property is specific to Slate:
    // https://github.com/ianstormtaylor/slate/blob/16ff44d0566889a843a346215d3fb7621fc0ed8c/packages/slate-react/src/components/editable.tsx#L193
    if (params.word.text === params.quicktext.shortcut) {
        const deleteWordBackward = new InputEvent('beforeinput', {
            bubbles: true,
            // template shortcut will always be the word before the cursor
            inputType: 'deleteWordBackward'
        });
        params.element.dispatchEvent(deleteWordBackward);
    }

    // only supports plain text
    const content = htmlToText(params.text);
    const insertText = new InputEvent('beforeinput', {
        bubbles: true,
        inputType: 'insertText',
        data: content
    });
    params.element.dispatchEvent(insertText);
}
