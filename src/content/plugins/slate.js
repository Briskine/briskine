/* Slate editor plugin
 */

import {parseTemplate} from '../utils';
import {isSlate} from '../utils/editor-slate';
import {insertSlateText} from '../utils/editor-slate';

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
