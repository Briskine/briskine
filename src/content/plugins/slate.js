/* Slate editor plugin
 */

import {parseTemplate} from '../utils.js';
import {isSlate} from '../utils/editor-slate.js';
import {insertSlateText} from '../utils/editor-slate.js';

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
