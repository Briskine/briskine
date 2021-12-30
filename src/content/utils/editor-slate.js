/* global InputEvent */
/* Slate
 * framework for building rich text editors.
 * https://github.com/ianstormtaylor/slate
 */

import {htmlToText} from './plain-text.js';
import {setCursorPosition} from './editor-generic.js';

export function isSlate (element) {
    return element.dataset.slateEditor;
}

export function insertSlateText (params = {}) {
    params.element.focus();

    // restore the cursor at the location it was,
    // before opening the dialog.
    setCursorPosition(params.element, params.focusNode);

    // Slate won't handle the text manipulation events until it notices we restored focus.
    // The timeout is required for inserting templates with the dialog.
    setTimeout(() => {
        // Slate uses onbeforeinput exclusively, and does not notice content inserted from outside.
        // https://docs.slatejs.org/concepts/xx-migrating#beforeinput
        // Use the Slate-specific method to insert and remove text,
        // using custom synthetic beforeinput events.
        // The inputType property value is handled by Slate:
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
    });
}
