/* Draft.js plugin
 */

import {parseTemplate} from '../utils.js';
import {isDraft, insertDraftText} from '../utils/editor-draft.js';

export default (params = {}) => {
    if (!isDraft(params.element)) {
        return false;
    }

    var parsedTemplate = parseTemplate(params.quicktext.body, {});

    insertDraftText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
