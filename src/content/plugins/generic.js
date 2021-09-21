/* Generic plugin
 * When no other plugin matches.
 */

import {parseTemplate} from '../utils';
import {insertTemplate} from '../utils/editor-generic';

export default (params = {}) => {
    var parsedTemplate = parseTemplate(params.quicktext.body, {});

    insertTemplate(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
