/* CRM plugin
 */

import {insertText, parseTemplate} from '../utils';

function getVariableAttribute (element) {
    const attributes = [ 'data-gorgias-variables', 'data-briskine-variables' ];
    const attribute = attributes.find((attr) => element.hasAttribute(attr));
    return element.getAttribute(attribute);
}

function isActive (element) {
    return element && getVariableAttribute(element);
}

function decodeAttribute (attr = '') {
    return JSON.parse(decodeURIComponent(attr));
}

function getData (element) {
    return decodeAttribute(getVariableAttribute(element));
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
