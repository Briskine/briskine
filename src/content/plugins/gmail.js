/* Gmail plugin
 */

import {parseTemplate} from '../utils.js'
import {insertTemplate} from '../editors/editor-universal.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import createContact from '../utils/create-contact.js'
import {enableBubble} from '../bubble.js'

const fromFieldSelector = '.az2';
const textfieldContainerSelector = '.M9';

var regExString = /"?([^ ]*)\s*(.*)"?\s*[(<]([^>)]+)[>)]/;
var regExEmail = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/;

function parseString (string = '') {
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
    const data = {
        from: [],
        to: [],
        cc: [],
        bcc: [],
        subject: ''
    };

    if (isContentEditable(params.element)) {
        // get details from the account details tooltip
        const $email = document.querySelector('.gb_be > :last-child')
        const $fullName = $email ? $email.previousElementSibling : null

        const fullNameText = $fullName ? $fullName.innerText : ''
        const emailText = $email ? $email.innerText : ''
        data.from = [ parseString(`${fullNameText} <${emailText}>`) ]

        const $container = params.element.closest(textfieldContainerSelector);
        if ($container) {
            // if we use multiple aliases,
            // get from details from the alias selector at the top of the compose box.
            const $fromSelect = $container.querySelector(fromFieldSelector);
            if ($fromSelect) {
                data.from = [ parseString($fromSelect.innerText) ];
            }

            [ 'to', 'cc', 'bcc' ].forEach((fieldName) => {
                data[fieldName] = Array.from(
                    $container.querySelectorAll(`input[name=${fieldName}], [name=${fieldName}] [role=option]`)
                  ).map((field) => {
                    if (field.value) {
                      return parseString(field.value)
                    }

                    const email = field.getAttribute('data-hovercard-id')
                    if (email) {
                      return createContact({
                        email: email,
                        name: field.getAttribute('data-name')
                      })
                    }

                    return {}
                  })
            });

            const $subjectField = $container.querySelector('input[name=subjectbox]');
            if ($subjectField) {
                data.subject = ($subjectField.value || '').replace(/^Re: /, '');
            }
        }
    } else {
        // plain HTML gmail
        const $user = document.querySelector('#guser b');
        if ($user) {
            data.from = [ parseString($user.innerText) ];
        }

        const $to = document.querySelector('#to');

        if ($to) {
            // compose window
            [ 'to', 'cc', 'bcc' ].forEach((fieldName) => {
                const $field = document.getElementById(fieldName);
                if ($field) {
                    data[fieldName] = ($field.value || '').split(',');
                }
            });

            const $subject = document.querySelector('input[name=subject]');
            if ($subject) {
                data.subject = $subject.value;
            }
        } else {
            // reply window
            const $subject = document.querySelector('h2 b');
            if ($subject) {
                data.subject = $subject.innerText;
            }

            const $replyAll = document.querySelector('#replyall');
            // if there are multiple reply to options
            if ($replyAll) {
                // get the last text node next to the checked radio
                const $container = params.element.closest('table');
                if ($container) {
                    const $to = $container.querySelector('input[type=radio]:checked');
                    if ($to) {
                        const $toContainer = $to.closest('tr');
                        const $label = $toContainer.querySelector('label');
                        const labelText = Array.from($label.childNodes).pop().textContent;
                        data.to = labelText.split(',');
                    }

                }
            }
        }

    }

    return data
}

// from field support for aliases
function setFromField ($textfield, fromEmail = '') {
    // get current compose container,
    // in case we are in reply area.
    const $container = $textfield.closest(textfieldContainerSelector);

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

function extraField ($parent, fieldName) {
  if (!parent) {
    return
  }

  return $parent.querySelector(`textarea[name=${fieldName}], [name=${fieldName}] input`)
}

function before (params, data) {
    const $parent = params.element.closest(textfieldContainerSelector);

    if (params.quicktext.subject) {
        var parsedSubject = parseTemplate(params.quicktext.subject, data);
        $parent.querySelector('input[name=subjectbox]').value = parsedSubject;
    }

    if (params.quicktext.to ||
        params.quicktext.cc ||
        params.quicktext.bcc
    ) {
        // click the receipients row.
        // a little jumpy,
        // but the only to way to show the new value.
        $parent.querySelector('.aoD.hl').focus();
    }

    if (params.quicktext.to) {
        var parsedTo = parseTemplate(params.quicktext.to, data);
        const $toField = extraField($parent, 'to')
        if ($toField) {
          $toField.value = parsedTo
        }
    }

    const buttonSelectors = {
        cc: '.aB.gQ.pE',
        bcc: '.aB.gQ.pB'
    };

    [ 'cc', 'bcc' ].forEach((fieldName) => {
        if (params.quicktext[fieldName]) {
            const parsedField = parseTemplate(params.quicktext[fieldName], data);
            $parent.querySelector(buttonSelectors[fieldName]).dispatchEvent(new MouseEvent('click', {bubbles: true}));
            const $field = extraField($parent, fieldName)
            if ($field) {
              $field.value = parsedField
            }
        }
    });
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

    // from field support, when using multiple aliases.
    // set the from field before getting data,
    // to have up-to-date data.
    if (params.quicktext.from) {
        setFromField(params.element, params.quicktext.from);
    }

    var data = getData(params);
    var parsedTemplate = parseTemplate(params.quicktext.body, data);

    before(params, data);

    insertTemplate(Object.assign({
        text: parsedTemplate
    }, params))

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
