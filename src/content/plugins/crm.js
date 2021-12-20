/* CRM plugin
 */

import {parseTemplate} from '../utils.js';
import {insertTemplate} from '../utils/editor-generic.js';

function getVariableAttribute (element) {
    const attributes = [ 'data-gorgias-variables', 'data-briskine-variables' ];
    const attribute = attributes.find((attr) => element.hasAttribute(attr));
    const value = element.getAttribute(attribute);
    // return empty string if attribute not found.
    // getAttribute returns '' or null.
    return value || '';
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

    insertTemplate(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
