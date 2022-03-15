/* Draft.js plugin
 */

import {parseTemplate} from '../utils.js';
import {isDraft, insertDraftTemplate} from '../editors/editor-draft.js';

export default (params = {}) => {
    if (!isDraft(params.element)) {
        return false;
    }

    var parsedTemplate = parseTemplate(params.quicktext.body, {});

    insertDraftTemplate(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
