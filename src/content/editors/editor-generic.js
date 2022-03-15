/* Generic editors
 */

import {isContentEditable} from '../utils.js';
import {htmlToText} from '../utils/plain-text.js';

// Set the cursor position at the end of the focusNode.
// Used when inserting templates with the dialog,
// and the correct caret position is lost.
export function setCursorPosition (container, node) {
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

export function insertTemplate (params = {}) {
    // restore focus to the editable area
    params.element.focus();

    if (isContentEditable(params.element)) {
        const {range, focusNode} = setCursorPosition(params.element, params.focusNode);

        // delete shortcut
        if (params.word.text === params.quicktext.shortcut) {
            range.setStart(focusNode, params.word.start);
            range.setEnd(focusNode, params.word.end);
            range.deleteContents();
        }

        var templateNode = range.createContextualFragment(params.text);
        range.insertNode(templateNode);
        range.collapse();
    } else {
        // convert html to text for textfields
        const content = htmlToText(params.text);
        const textfieldValue = params.element.value;
        let cursorOffset = params.word.end + content.length;

        // if the current word matches the shortcut then remove it
        // otherwise skip it (ex: from dialog)
        let wordStart = params.word.start;
        if (params.word.text === params.quicktext.shortcut) {
            // decrease the cursor offset with the removed text length
            cursorOffset = cursorOffset - params.word.end - params.word.start;
        } else {
            // don't delete anything in the textarea
            // just add the qt
            wordStart = params.word.end;
        }

        params.element.value = textfieldValue.substr(0, wordStart) + content + textfieldValue.substr(params.word.end);

        // set focus at the end of the added template
        params.element.setSelectionRange(cursorOffset, cursorOffset);
    }

    // trigger multiple change events,
    // for frameworks and scripts to notice changes to the editable fields.
    [ 'input', 'change' ].forEach((eventType) => {
        params.element.dispatchEvent(new Event(eventType, {bubbles: true}));
    });

    return;
}
