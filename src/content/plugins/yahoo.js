/* Yahoo plugin
 */

import $ from 'jquery';

import {parseTemplate} from '../utils';
import {insertTemplate} from '../utils/editor-generic';

function parseName (name) {
    name = name.trim();

    var first_name = '';
    var last_name = '';

    var firstSpace = name.indexOf(' ');

    if(firstSpace === -1) {
        firstSpace = name.length;
    }

    first_name = name.substring(0, firstSpace);
    last_name = name.substring(firstSpace + 1, name.length);

    return {
        first_name: first_name,
        last_name: last_name
    };
}

// get all required data from the dom
function getData (params) {
    var vars = {
        from: [],
        to: [],
        cc: [],
        bcc: [],
        subject: ''
    };

    var $composeContainer = $(params.element).parents('.compose').first();

    // get your name from the top-right profile
    var fromName = $('#yucs-profile b').first().text();
    var fromEmail = $('#yucs-profile-panel b + b').text();

    // get your own name from the top right
    var from = {
        name: fromName,
        first_name: '',
        last_name: '',
        email: fromEmail + '@yahoo.com'
    };

    var parsedName = parseName(fromName);

    from.first_name = parsedName.first_name;
    from.last_name = parsedName.last_name;

    vars.from.push(from);

    $composeContainer.find('#to li').each(function() {
        var $li = $(this);
        var liText = $li.text().trim();

        // TODO check if the liText is the name or the email

        if(liText) {
            var parsedLiName = parseName(liText);

            vars.to.push({
                name: liText,
                first_name: parsedLiName.first_name,
                last_name: parsedLiName.last_name,
                email: ''
            });
        }
    });

    return vars;
}

function before (params, data) {
    var $parent = $(params.element).closest('[data-test-id="compose"]');

    if (params.quicktext.subject) {
        var parsedSubject = parseTemplate(params.quicktext.subject, data);
        var $subjectField = $('[data-test-id="compose-subject"]', $parent);
        $subjectField.val(parsedSubject);
        $subjectField.get(0).dispatchEvent(new Event('input', {bubbles: true}));
    }

    // BUG to/cc/bcc fields stopped working
//     if (params.quicktext.to) {
//         var parsedTo = parseTemplate(params.quicktext.to, data);
//         var $toField = $('[data-test-id="compose-header-field-to"]', $parent);
//         $toField.val(parsedTo);
//
//         $toField.get(0).dispatchEvent(new Event('blur'));
//     }
//
//     if (params.quicktext.cc ||
//         params.quicktext.bcc) {
//         click show cc/bcc button
//         var $btn = $('[data-test-id="btn-cc"]', $parent);
//         $btn.get(0).click();
//     }
//
//     if (params.quicktext.cc) {
//         var parsedCc = parseTemplate(params.quicktext.cc, data);
//         var $ccField = $('[data-test-id="compose-header-field-cc"]', $parent);
//         $ccField.val(parsedCc);
//
//         $ccField.get(0).dispatchEvent(new Event('blur'));
//     }
//
//     if (params.quicktext.bcc) {
//         var parsedBcc = parseTemplate(params.quicktext.bcc, data);
//         var $bccField = $('[data-test-id="compose-header-field-bcc"]', $parent);
//         $bccField.val(parsedBcc);
//
//         $bccField.get(0).dispatchEvent(new Event('blur'));
//     }

    return params;
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var yahooUrl = 'mail.yahoo.com/';
    // trigger the extension based on url
    if(window.location.href.indexOf(yahooUrl) !== -1) {
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

    before(params, data);

    insertTemplate(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
