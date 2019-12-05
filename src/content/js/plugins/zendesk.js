/* Zendesk plugin
 */

import $ from 'jquery';

import {parseTemplate, insertText} from '../utils';

function getData (params) {
    // get top-most workspace
    var workspace = $(params.element).parents('.workspace').last();

    var agent_name = $('#face_box .name').text();
    var agent_first_name = agent_name.split(' ')[0];
    var agent_last_name = agent_name.split(' ')[1];

    var name = workspace.find('span.sender').text().split('<')[0];
    var first_name = name.split(' ')[0];
    var last_name = name.split(' ')[1];

    var vars = {
        from: [{
            'name': agent_name,
            'first_name': agent_first_name,
            'last_name': agent_last_name,
            'email': ''
        }],
        to: [{
            'name': name,
            'first_name': first_name,
            'last_name': last_name,
            'email': workspace.find('span.sender .email').text()
        }],
        cc: [],
        bcc: [],
        subject: workspace.find('input[name=subject]').val()
    };

    return vars;
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var zendeskUrl = '.zendesk.com';
    // trigger the extension based on url
    if(window.location.hostname.indexOf(zendeskUrl) !== -1) {
        activeCache = true;
    }

    return activeCache;
}

export default (params = {}) => {
    if (!isActive()) {
        return false;
    }

    var data = getData(params);
    var parsedTemplate = parseTemplate(params.quicktext.body, data);

    insertText(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
