/* Generic editors
 */

import {isContentEditable} from '../utils';

export function insertTemplate (params = {}) {
    // restore focus to the editable area
    params.element.focus();

    if (isContentEditable) {
        const range = window.getSelection().getRangeAt(0);
        // restore focus to the correct position,
        // in case we insert templates using the dialog.
        range.setStartAfter(params.focusNode);
        range.collapse();

        // delete shortcut
        if (params.word.text === params.quicktext.shortcut) {
            range.setStart(params.focusNode, params.word.start);
            range.setEnd(params.focusNode, params.word.end);
            range.deleteContents();
        }

        const fragment = range.createContextualFragment(params.text);
        const plainText = domToText(fragment, params.newline);

        const node = document.createTextNode(plainText);
        range.insertNode(node);
        range.collapse();
    } else {
        // TODO textfield

    }

    params.element.dispatchEvent(new Event('input', {
        bubbles: true
    }));

    return;
}
