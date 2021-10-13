/* Fastmail plugin
 */

import $ from 'jquery';

import {parseTemplate} from '../utils';
import {insertTemplate} from '../utils/editor-generic';

var parseList = function (list) {
    return list.filter(function (a) {
        return a;
    }).map(function (a) {
        return parseString(a);
    });
};

var regExString = /"?([^ ]*)\s*(.*)"?\s*<([^>]+)>/;
var regExEmail = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/;

var parseString = function (string) {
    var match = regExString.exec(string),
        data = {
            name: '',
            first_name: '',
            last_name: '',
            email: ''
        };

    if (match && match.length >= 4) {
        data.first_name = match[1].replace('"', '').trim();
        data.last_name = match[2].replace('"', '').trim();
        data.name = data.first_name + (data.first_name && data.last_name ? ' ' : '') + data.last_name;
        data.email = match[3];
    } else {
        // try to match the email
        match = regExEmail.exec(string);
        if (match) {
            data.email = match[0];
        }
    }

    return data;
};

// get all required data from the dom
function getData () {
    var from = [],
        to = [],
        cc = [],
        bcc = [],
        subject = '';

    var $container = $('.v-Compose');
    from = $container.find('.v-ComposeFrom-bottom select option').toArray().map(function (a) {
        return $(a).text();
    });

    to = $container.find('textarea[id$="to-input"]').toArray().map(function (a) {
        return a.value;
    });
    cc = $container.find('textarea[id$="cc-input"]').toArray().map(function (a) {
        return a.value;
    });
    bcc = $container.find('textarea[id$="cc-input"]').toArray().map(function (a) {
        return a.value;
    });
    subject = $container.find('input[id$="subject-input"]').val();

    return {
        from: parseList(from),
        to: parseList(to),
        cc: parseList(cc),
        bcc: parseList(bcc),
        subject: subject
    };
}

function isHidden (el) {
    return (el.offsetParent === null);
}

function before (params, data) {
    var $parent = $(params.element).closest('.v-Compose');

    if (params.quicktext.subject) {
        var parsedSubject = parseTemplate(params.quicktext.subject, data);
        $('input[id$="subject-input"]', $parent).val(parsedSubject);
    }

    if (params.quicktext.to) {
        var parsedTo = parseTemplate(params.quicktext.to, data);
        var $toField = $('textarea[id$="to-input"]', $parent);
        $toField.val(parsedTo);

        // jQuery's trigger does not work
        $toField.get(0).dispatchEvent(new Event('input'));
    }

    var $btns = $('.v-Compose-addCcBcc .u-subtleLink', $parent);

    if (params.quicktext.cc) {
        var parsedCc = parseTemplate(params.quicktext.cc, data);

        var $ccField = $('textarea[id$="cc-input"]', $parent);

        // only if the cc field is hidden,
        // because the same button is used to show/hide the field.
        if (isHidden($ccField.get(0))) {
            var $ccBtn = $btns.eq(0);
            // dispatchEvent or trigger do not work
            $ccBtn.get(0).click();
        }

        $ccField.val(parsedCc);

        $ccField.get(0).dispatchEvent(new Event('input'));
    }

    if (params.quicktext.bcc) {
        var parsedBcc = parseTemplate(params.quicktext.bcc, data);

        var $bccField = $('textarea[id$="bcc-input"]', $parent);

        // only if the bcc field is hidden
        if (isHidden($bccField.get(0))) {
            var $bccBtn = $btns.eq(1);
            // dispatchEvent or trigger do not work
            $bccBtn.get(0).click();
        }

        $bccField.val(parsedBcc);

        $bccField.get(0).dispatchEvent(new Event('input'));
    }
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var fastmailUrl = '//www.fastmail.com/';

    // trigger the extension based on url
    if (window.location.href.indexOf(fastmailUrl) !== -1) {
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
