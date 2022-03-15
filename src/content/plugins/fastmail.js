/* Fastmail plugin
 */

import {parseTemplate} from '../utils.js';
import {insertTemplate} from '../editors/editor-generic.js';

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

    var $container = document.querySelector('.v-Compose');
    from = Array.from($container.querySelectorAll('.v-ComposeFrom-bottom select option')).map(function (a) {
      return a.innerText
    });

    to = Array.from($container.querySelectorAll('textarea[id$="to-input"]')).map(function (a) {
      return a.value
    });
    cc = Array.from($container.querySelectorAll('textarea[id$="cc-input"]')).map(function (a) {
      return a.value
    });
    bcc = Array.from($container.querySelectorAll('textarea[id$="cc-input"]')).map(function (a) {
      return a.value
    });
    const $subject = $container.querySelector('input[id$="subject-input"]');
    if ($subject) {
      subject = $subject.value
    }

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
    var $parent = params.element.closest('.v-Compose')

    if (params.quicktext.subject) {
      var parsedSubject = parseTemplate(params.quicktext.subject, data)
      $parent.querySelector('input[id$="subject-input"]').value = parsedSubject
    }

    if (params.quicktext.to) {
      var parsedTo = parseTemplate(params.quicktext.to, data)
      var $toField = $parent.querySelector('textarea[id$="to-input"]')
      $toField.value = parsedTo

      $toField.dispatchEvent(new Event('input'))
    }

    var $btns = $parent.querySelectorAll('.v-Compose-addCcBcc .u-subtleLink')

    if (params.quicktext.cc) {
        var parsedCc = parseTemplate(params.quicktext.cc, data)

        var $ccField = $parent.querySelector('textarea[id$="cc-input"]')

        // only if the cc field is hidden,
        // because the same button is used to show/hide the field.
        if (isHidden($ccField)) {
            var $ccBtn = $btns[0]
            // dispatchEvent or trigger do not work
            $ccBtn.click()
        }

        $ccField.value = parsedCc

        $ccField.dispatchEvent(new Event('input'))
    }

    if (params.quicktext.bcc) {
        var parsedBcc = parseTemplate(params.quicktext.bcc, data)

        var $bccField = $parent.querySelector('textarea[id$="bcc-input"]')

        // only if the bcc field is hidden
        if (isHidden($bccField)) {
            var $bccBtn = $btns[1]
            // dispatchEvent or trigger do not work
            $bccBtn.click()
        }

        $bccField.value = parsedBcc

        $bccField.dispatchEvent(new Event('input'))
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
