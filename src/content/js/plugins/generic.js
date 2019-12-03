/* Generic plugin
 * When no other plugin matches.
 */

import {insertText, parseTemplate} from '../utils';

export default (params = {}) => {
    var parsedTemplate = parseTemplate(params.quicktext.body, {});

    // BUG sometimes contenteditable doesn't prevent focus switch,
    // still switches focus with Tab.
    insertText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
