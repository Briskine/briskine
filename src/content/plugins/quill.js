/* Quill editor plugin
 */

import {parseTemplate} from '../utils.js';
import {isQuill} from '../editors/editor-quill.js';
import {insertTemplate} from '../editors/editor-generic.js';
import {htmlToText} from '../utils/plain-text.js';

export default (params = {}) => {
    if (!isQuill(params.element)) {
        return false;
    }

    // BUG
    // we can only insert text content in Quill.
    // trying to insert DOM nodes will throw an error because of
    // the custom event emitter used by Quill.
    var parsedTemplate = htmlToText(parseTemplate(params.quicktext.body, {}));
    insertTemplate(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
