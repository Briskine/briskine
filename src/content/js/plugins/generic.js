/* Generic plugin
 * When no other plugin matches.
 */

import {insertText, parseTemplate} from '../utils';

export default (params = {}) => {
    console.log('generic', params);
    var parsedTemplate = parseTemplate(params.quicktext.body, {});

    // BUG contenteditable doesn't prevent focus switch, still switches focus with Tab
    insertText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
