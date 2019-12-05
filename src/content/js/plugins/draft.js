/* Draft.js plugin
 */

import {insertDraftText, parseTemplate} from '../utils';

function isActive (params = {}) {
   var contentsElement = params.element.querySelector('[data-contents]');
   if (contentsElement) {
       return true;
   }
}

export default (params = {}) => {
    if (!isActive(params)) {
        return false;
    }

    var parsedTemplate = parseTemplate(params.quicktext.body, {});

    insertDraftText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
