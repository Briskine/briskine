/* ProseMirror plugin
 */

import {parseTemplate} from '../utils';
import {insertTemplate} from '../utils/editor-generic';

function replaceNewlines (text = '') {
    return text.replace(/(\r\n|\r|\n)/g, '<br>');
}

function isActive (params = {}) {
   return params.element.classList.contains('ProseMirror');
}

export default (params = {}) => {
    if (!isActive(params)) {
        return false;
    }

    var parsedTemplate = parseTemplate(params.quicktext.body, {});
    var templateWithBreaks = replaceNewlines(parsedTemplate);

    insertTemplate(Object.assign({
        text: templateWithBreaks
    }, params));

    return true;
};
