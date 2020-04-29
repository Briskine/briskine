/* Quill editor plugin
 */

import {parseTemplate} from '../utils';
import {isQuill} from '../utils/editors';
import {insertPlainText} from '../utils/plain-text';

export default (params = {}) => {
    if (!isQuill(params.element)) {
        return false;
    }

    var parsedTemplate = parseTemplate(params.quicktext.body, {});

    // BUG
    // we can only insert text content in Quill.
    // trying to insert DOM nodes will throw an error because of
    // the custom event emitter used by Quill.
    insertPlainText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
