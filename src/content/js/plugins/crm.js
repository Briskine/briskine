/* CRM plugin
 */

import {insertText, parseTemplate} from '../utils';

const attributeVariables = 'data-gorgias-variables';

function isActive (element) {
    return element && element.hasAttribute(attributeVariables);
}

function decodeAttribute (attr = '') {
    return JSON.parse(decodeURIComponent(attr));
}

function getData (element) {
    const value = element.getAttribute(attributeVariables);
    return decodeAttribute(value);
}

export default (params = {}) => {
    if (!isActive(params.element)) {
        return false;
    }

    var data = getData(params.element);
    var parsedTemplate = parseTemplate(params.quicktext.body, data);

    insertText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
