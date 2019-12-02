/**
 * Utils
 */

import Handlebars from 'handlebars';
import _ from 'underscore';

export function isContentEditable (element) {
    return element && element.hasAttribute('contenteditable');
}

function PrepareVars (vars) {
    if (!vars) {
        return vars;
    }

    var prep = function (data) {
        // convert array to object
        data = _.extend({}, data);
        var flat = data[0];
        for (var i in flat) {
            if (flat.hasOwnProperty(i)) {
                data[i] = flat[i];
            }
        }
        return data;
    };

    if (vars.to && vars.to.length) {
        vars.to = prep(vars.to);
    }
    if (vars.from && vars.from.length) {
        vars.from = prep(vars.from);
    }
    if (vars.cc && vars.cc.length) {
        vars.cc = prep(vars.cc);
    }
    if (vars.bcc && vars.bcc.length) {
        vars.bcc = prep(vars.bcc);
    }
    return vars;
};

export function insertText (params = {}) {
    // the editor doesn't get the focus right-away.
    // so window.getSelection() returns the search field
    // in the dialog otherwise, instead of the editor
    params.element.focus();

    var doc = params.element.ownerDocument;
    // HACK
    var parsedTemplate = params.text;
    var word = params.word;

    if (isContentEditable(params.element)) {

        var selection = doc.getSelection();
        var range = doc.createRange();

        // setStart/setEnd work differently based on
        // the type of node
        // https://developer.mozilla.org/en-US/docs/Web/API/range.setStart
        var focusNode = params.focusNode;
        if (!document.body.contains(focusNode)) {
            focusNode = selection.focusNode;
        }

        // we need to have a text node in the end
        while (focusNode.nodeType === document.ELEMENT_NODE) {
            if (focusNode.childNodes.length > 0) {
                focusNode = focusNode.childNodes[selection.focusOffset]; // select a text node
            } else {
                // create an empty text node
                var tnode = doc.createTextNode('');

                // if the focusNode is the same as the element
                if (focusNode === params.element) {
                    // insert it in the node
                    focusNode.appendChild(tnode);
                } else {
                    // or attach it before the node
                    focusNode.parentNode.insertBefore(tnode, focusNode);
                }

                focusNode = tnode;
            }
        }

        // clear whitespace in the focused textnode
        if (focusNode.nodeValue) {
            focusNode.nodeValue = focusNode.nodeValue.trim();
        }

        // if the current word matches the shortcut then remove it otherwise skip it (ex: from dialog)
        if (word.text === params.quicktext.shortcut) {
            range.setStart(focusNode, word.start);
            range.setEnd(focusNode, word.end);
            range.deleteContents();
        } else {
            range.setStart(focusNode, word.end);
            range.setEnd(focusNode, word.end);
        }


        var qtNode = range.createContextualFragment(parsedTemplate);
        var lastQtChild = qtNode.lastChild;

        range.insertNode(qtNode);

        var caretRange = doc.createRange();
        caretRange.setStartAfter(lastQtChild);
        caretRange.collapse(true);
        // TODO move to facebook plugin
        // facebook/draft.js causes a dom re-render
        // when removing ranges.
        // looks like a no-content flash of the editor.
        if (!params.ignoreExistingRanges) {
            selection.removeAllRanges();
        }
        selection.addRange(caretRange);

        window.postMessage({
            source: 'gorgias-extension',
            payload: {
                event: 'template-inserted'
            }
        }, '*');

    } else {
        var $textarea = $(params.element),
            value = $textarea.val();

        // if the editor is enabled, we need to convert html into text
        if (App.settings.editor_enabled) {
            // we want to display the text momentarily before inserting it into the textarea
            // this is needed to give the correct spaces
            var temp = $('<div id="gorgias-temp-placeholder">').html(parsedTemplate);

            // find and replace links with plaintext
            temp.find('a').each(function () {
                var e = $(this);
                var href = e.attr('href');
                var text = $.trim(e.text());
                var replacement = "";

                if (!text.length) {
                    e.replaceWith("<span>" + href + "</span>");
                } else if (href.length) {
                    e.replaceWith("<span>" + text + " ( " + href + " )</span>");
                } else {
                    // remove it completly if there is no url
                    e.remove();
                }

            });

            temp.find('img').each(function () {
                var e = $(this);
                e.replaceWith("<span>" + e.attr('src') + "</span>");
            });

            $('body').append(temp);
            parsedTemplate = $('#gorgias-temp-placeholder')[0].innerText;
            $('#gorgias-temp-placeholder').remove();
        }

        var valueNew = '';
        var cursorOffset = word.end + parsedTemplate.length;

        // if the current word matches the shortcut then remove it
        // otherwise skip it (ex: from dialog)
        if (word.text === params.quicktext.shortcut) {

            valueNew = value.substr(0, word.start) + parsedTemplate + value.substr(word.end);

            // decrease the cursor offset with the removed text length
            cursorOffset -= word.end - word.start;

        } else {

            // don't delete anything in the textarea
            // just add the qt
            valueNew = value.substr(0, word.end) + parsedTemplate + value.substr(word.end);

        }

        $textarea.val(valueNew);

        // set focus at the end of the added qt
        $textarea[0].setSelectionRange(cursorOffset, cursorOffset);

    }
}

// replace from with name saved in settings
var replaceFrom = function (from, setting) {
    setting = _.extend({
        firstName: '',
        lastName: ''
    }, setting);
    from = from || [];

    if (!_.isArray(from)) {
        from = [from];
    }

    return from.map(function (f) {
        var user = _.extend({}, f);
        if (setting.firstName || setting.lastName) {
            user.first_name = setting.firstName;
            user.last_name = setting.lastName;
            user.name = setting.firstName + ' ' + setting.lastName;
        }

        return user;
    });
};

export function parseTemplate (template = '', data = {}) {
    // TODO replace vars.from with settings.name
//     App.settings.fetchSettings(function (settings) {
//         if (vars) {
//             vars.from = replaceFrom(vars.from, settings.name);
//         }

    return Handlebars.compile(template)(PrepareVars(data));
}

// TODO use method in all plugins
// split full name by last space.
export function splitFullName (fullname) {
    fullname = fullname || '';

    var lastSpaceIndex = fullname.lastIndexOf(' ');
    if (lastSpaceIndex < 1) {
        lastSpaceIndex = fullname.length;
    }

    return {
        first_name: fullname.substr(0, lastSpaceIndex),
        last_name: fullname.substr(lastSpaceIndex + 1)
    };
};

// extracts name and email from google sign-out title string.
// title = Google Account: User Name (user@email.net)
// TODO use method in all plugins
export function parseUserDetails (title) {
    var details = {
        email: '',
        name: ''
    };
    var sep = ':';

    if (title && title.indexOf(sep) !== -1) {
        var prefix = title.split(sep)[0] + sep;
        details.name = title.replace(prefix, '').trim();
    }

    if (details.name) {
        var openBracket = details.name.lastIndexOf('(');
        // in case of no brackets
        if (openBracket === -1) {
            openBracket = details.name.length;
        } else {
            details.email = details.name.substr(openBracket).slice(1, -1);
        }

        details.name = details.name.substr(0, openBracket).trim();
    }

    return jQuery.extend(details, splitFullName(details.name));
};

