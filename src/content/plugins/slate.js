/* Slate editor plugin
 */

import {parseTemplate} from '../utils.js';
import {isSlate} from '../editors/editor-slate.js';
import {insertSlateText} from '../editors/editor-slate.js';

export default (params = {}) => {
    if (!isSlate(params.element)) {
        return false;
    }

    var parsedTemplate = parseTemplate(params.quicktext.body, {});
    insertSlateText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
