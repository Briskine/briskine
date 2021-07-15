/* Gmail plugin
 */

import $ from 'jquery';

import {insertText, parseTemplate, isContentEditable} from '../utils';
import {enableBubble} from '../bubble';

const fromFieldSelector = '.az2';
const textfieldContainerSelector = '.M9';

function parseList (list) {
    return list.filter(function (a) {
        return a;
    }).map(function (a) {
        return parseString(a);
    });
}

var regExString = /"?([^ ]*)\s*(.*)"?\s*[(<]([^>)]+)[>)]/;
var regExEmail = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/;

function parseString (string) {
    var match = regExString.exec(string.trim());
    var data = {
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
}

// get all required data from the dom
function getData (params) {
    var from = [],
        to = [],
        cc = [],
        bcc = [],
        subject = '';

    if (isContentEditable(params.element)) {
        const userInfoSelector = '.gb_bb';
        const $fullName = document.querySelector(`${userInfoSelector} *:first-child`);
        const $email = document.querySelector(`${userInfoSelector} *:nth-child(2)`);

        // get from details from global user info
        const fullNameText = $fullName ? $fullName.innerText : '';
        const emailText = $email ? $email.innerText : '';
        let fromString = `${fullNameText} <${emailText}>`;

        // TODO
        // if we use multiple aliases, get from details from
        // the alias selector at the top of the compose box.
        // TODO merge with container below
        const $container2 = params.element.closest(textfieldContainerSelector);
        if ($container2) {
            const $fromSelect = $container2.querySelector(fromFieldSelector);
            if ($fromSelect) {
                fromString = $fromSelect.innerText;
            }
        }

        from.push(parseString(fromString));

        var $container = $(params.element).closest('table').parent().closest('table').parent().closest('table');

        to = $container.find('input[name=to]').toArray().map(function (a) {
            return a.value;
        });
        cc = $container.find('input[name=cc]').toArray().map(function (a) {
            return a.value;
        });
        bcc = $container.find('input[name=bcc]').toArray().map(function (a) {
            return a.value;
        });
        subject = ($container.find('input[name=subjectbox]').val() || '').replace(/^Re: /, "");
    } else {
        from.push($('#guser').find('b').text());
        var toEl = $('#to');

        // Full options window
        if (toEl.length) {
            to = toEl.val().split(',');
            cc = $('#cc').val().split(',');
            bcc = $('#bcc').val().split(',');
            subject = $('input[name=subject]').val();
        } else { // Reply window
            subject = $('h2 b').text();
            var replyToAll = $('#replyall');
            // It there are multiple reply to options
            if (replyToAll.length) {
                to = $('input[name=' + replyToAll.attr('name') + ']:checked').closest('tr').find('label')
                // retrieve text but child nodes
                    .clone().children().remove().end().text().trim().split(',');
            } else {
                to = $(params.element).closest('table').find('td').first().find('td').first()
                // retrieve text but child nodes
                    .clone().children().remove().end().text().trim().split(',');
            }
        }

    }

    return {
        from: from,
        to: parseList(to),
        cc: parseList(cc),
        bcc: parseList(bcc),
        subject: subject
   };
}

// TODO experimental from field support
function setFromField (textfield) {
    // HACK HARDCODED
    const fromEmail = 'contact@briskine.com';
    // get current compose container,
    // in case we are in reply area.
    const $container = textfield.closest(textfieldContainerSelector);

    if ($container) {
        const $option = $container.querySelector(`[value="${fromEmail}"][role=menuitem]`);
        if ($option) {
            // select option
            $option.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
            // HACK mouseup needs to be triggered twice for the option to be selected
            $option.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
            $option.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
        }
    }
}

function before (params, data) {
    var $parent = $(params.element).closest('table.aoP');

    if (params.quicktext.subject) {
        var parsedSubject = parseTemplate(params.quicktext.subject, data);
        $parent.find('input[name=subjectbox]').val(parsedSubject);
    }

    if (params.quicktext.to ||
        params.quicktext.cc ||
        params.quicktext.bcc
    ) {
        // click the receipients row.
        // a little jumpy,
        // but the only to way to show the new value.
        $parent.find('.aoD.hl').trigger('focus');
    }

    if (params.quicktext.to) {
        var parsedTo = parseTemplate(params.quicktext.to, data);
        $parent.find('textarea[name=to]').val(parsedTo);
    }

    if (params.quicktext.cc) {
        var parsedCc = parseTemplate(params.quicktext.cc, data);

        // click the cc button
        $parent.find('.aB.gQ.pE').trigger('click');

        $parent.find('textarea[name=cc]').val(parsedCc);
    }

    if (params.quicktext.bcc) {
        var parsedBcc = parseTemplate(params.quicktext.bcc, data);

        // click the bcc button
        $parent.find('.aB.gQ.pB').trigger('click');

        $parent.find('textarea[name=bcc]').val(parsedBcc);
    }

}

// insert attachment node on gmail editor
var setAttachmentNode = function (attachment) {
    if (!attachment) {
        return;
    }
    var range = window.getSelection().getRangeAt(0);

    function concatIconString(number, type) {
        return "https://ssl.gstatic.com/docs/doclist/images/icon_" + number + "_" + type + "_list.png";
    }

    var driveIcons = {
        image: concatIconString('11', 'image'),
        audio: concatIconString('10', 'audio'),
        pdf: concatIconString('12', 'pdf'),
        video: concatIconString('11', 'video'),
        archive: concatIconString('9', 'archive'),
        word: concatIconString('10', 'word'),
        text: concatIconString('10', 'text'),
        generic: concatIconString('10', 'generic')
    };

    function getDriveIcon(attachment) {
        var attachmentIcon;
        switch (attachment.name.split('.').pop()) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'svg':
                attachmentIcon = driveIcons.image;
                break;
            case 'doc':
            case 'docx':
                attachmentIcon = driveIcons.word;
                break;
            case 'pdf':
                attachmentIcon = driveIcons.pdf;
                break;
            case 'tar':
            case 'zip':
            case 'rar':
            case 'gz':
            case 'uca':
            case 'dmg':
            case 'iso':
                attachmentIcon = driveIcons.archive;
                break;
            case 'riff':
            case 'wav':
            case 'bwf':
            case 'ogg':
            case 'aiff':
            case 'caf':
            case 'flac':
            case 'mp3':
            case 'wma':
            case 'au':
            case 'aac':
            case 'mp4':
            case 'm4a':
                attachmentIcon = driveIcons.audio;
                break;
            case 'webm':
            case 'flv':
            case 'f4v':
            case 'f4p':
            case 'f4a':
            case 'f4b':
            case 'ogv':
            case 'ogg':
            case 'avi':
            case 'mov':
            case 'qt':
            case 'yuv':
            case 'm4p':
            case 'm4v':
            case 'mpg':
            case 'mpeg':
            case 'm2v':
            case 'm4v':
            case 'svi':
            case '3gp':
            case 'roq':
                attachmentIcon = driveIcons.video;
                break;
            case 'js':
            case 'txt':
            case 'css':
            case 'html':
            case 'json':
                attachmentIcon = driveIcons.text;
                break;
            default:
                attachmentIcon = driveIcons.generic;
        }
        return attachmentIcon;
    }

    var icon = getDriveIcon(attachment);

    var attachmentString = '&#8203;<div contenteditable="false" class="gmail_chip" style="width: 396px; height: 18px; max-height: 18px; padding: 5px; color: rgb(34, 34, 34); font-family: arial; font-style: normal; font-weight: bold; font-size: 13px; cursor: default; border: 1px solid rgb(221, 221, 221); line-height: 1; background-color: rgb(245, 245, 245);"><img src="//ssl.gstatic.com/ui/v1/icons/common/x_8px.png" style="opacity: 0.55; cursor: pointer; float: right; position: relative; top: -1px; display: none;"><a href=' + attachment.url + ' target="_blank" style=" display:inline-block; max-width: 366px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-decoration: none; cursor: pointer; padding: 1px 0; border: none; " aria-label=' + attachment.name + '><img style="vertical-align: bottom; border: none;" src=' + icon + '>&nbsp;<span dir="ltr" style="color: rgb(17, 85, 204); text-decoration: none; vertical-align: bottom;">' + attachment.name + '</span></a></div>&#8203;';

    function addEventToAttachment(node) {
        var closeImage = node.querySelector('img');
        var link = node.querySelector('a');
        var spanLink = link.querySelector('span');

        node.onmouseenter = function () {
            this.style.border = "1px solid rgb(204, 204, 204)";
            closeImage.style.display = 'block';
            spanLink.style.textDecoration = 'underline';
        };
        node.onmouseleave = function () {
            this.style.border = "1px solid rgb(221, 221, 221)";
            closeImage.style.display = 'none';
            spanLink.style.textDecoration = 'none';
        };
        link.onclick = function () {
            window.open(link.href, '_blank');
        };
        closeImage.onclick = function (e) {
            e.stopPropagation();
            range.commonAncestorContainer.removeChild(node);
        };
    }

    var attachmentNode = range.createContextualFragment(attachmentString);
    addEventToAttachment(attachmentNode.firstElementChild);
    range.insertNode(attachmentNode);

    range.collapse();
};

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var gmailUrl = '//mail.google.com/';

    // trigger the extension based on url
    if (window.location.href.indexOf(gmailUrl) !== -1) {
        activeCache = true;
    }

    return activeCache;
}

function setup () {
    if (!isActive()) {
        return false;
    }

    enableBubble();
}

setup();

export default (params = {}) => {
    if (!isActive()) {
        return false;
    }

    // TODO
    // set the from field before getting data,
    // to have up-to-date data.
    setFromField(params.element);

    var data = getData(params);
    var parsedTemplate = parseTemplate(params.quicktext.body, data);

    before(params, data);

    insertText(Object.assign({
        text: parsedTemplate
    }, params));

    // add attachments
    if (
        isContentEditable(params.element) &&
        params.quicktext.attachments &&
        params.quicktext.attachments.length
    ) {
        params.quicktext.attachments.map(function (attachment) {
            setAttachmentNode(attachment);
        });
    }

    return true;
};
