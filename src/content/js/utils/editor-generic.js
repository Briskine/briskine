/* Generic editors
 */

import {isContentEditable} from '../utils';
import {htmlToText} from './plain-text';

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

        // TODO insert text as it comes, and convert as required in plugins
        const plainText = htmlToText(params.text, params.newline);

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
