/**
 * Utils
 */

import $ from 'jquery';
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
}

export function insertText (params = {}) {
    // the editor doesn't get the focus right-away.
    // so window.getSelection() returns the search field
    // in the dialog otherwise, instead of the editor
    params.element.focus();

    var doc = params.element.ownerDocument;
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

        // Loom Chrome extension causes the focusNode to always be an element
        // on certain websites.
        // we need to have a text node in the end
        while (focusNode.nodeType === document.ELEMENT_NODE) {
            if (focusNode.childNodes.length > 0) {
                // when focusNode can have child nodes,
                // focusOffset is the index in the childNodes collection
                // of the focus node where the selection ends.
                var focusOffset = selection.focusOffset;
                // *but* if the focus point is placed after the anchor point,
                // (when we insert templates with the shortcut, not from the dialog),
                // the focus point is the first position after (not part of the selection),
                // therefore focusOffset can be equal to the length of focusNode childNodes.
                if (selection.focusOffset === focusNode.childNodes.length) {
                    focusOffset = selection.focusOffset - 1;
                }
                // select a text node
                focusNode = focusNode.childNodes[focusOffset];
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
        selection.removeAllRanges();
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
        if (window.App.settings.editor_enabled) {
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

    document.activeElement.dispatchEvent(new Event('input', {bubbles: true}));
}

// replace from with name saved in settings
function replaceFrom (from, setting) {
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
}

export function parseTemplate (template = '', data = {}) {
    // get "from" name from settings
    data.from = replaceFrom(data.from || {}, window.App.settings.cache.name);

    return Handlebars.compile(template)(PrepareVars(data));
}


function insertDraftFragment (text) {
  var sel = window.getSelection();
  var range = sel.getRangeAt(0);
  range.deleteContents();
  var node = range.createContextualFragment(text);
  range.insertNode(node);

  // collapsing the range toEnd (with FALSE/default) throws Draft offset error:
  // The offset [] is larger than the node's length.
  // must collapse to the start.
  range.collapse(true);

  return node;
}

// ZERO-WIDTH whitespace
var WHITESPACE = '\u200b';

function insertDraftBlock (text) {
  insertDraftFragment(text);
  // whitespace trick is needed to move the selection after the inserted text.
  // see above why we can't collapse range toEnd.
  // selection will be placed before the whitespace, but AFTER the template.
  // without the whitespace, the selection is apparently in the correct spot,
  // but after typing the first character, it jumps to the content start.
  // when we insert the template in-between text, it works as expected,
  // without the whitespace trick.
  insertDraftFragment(WHITESPACE);

  // update draft state
  document.activeElement.dispatchEvent(new Event('input', {bubbles: true}));
}

export function insertDraftText (params = {}) {
    params.element.focus();

    // delete shortcut
    if (params.word.text === params.quicktext.shortcut) {
        var range = window.getSelection().getRangeAt(0);
        range.setStart(params.focusNode, params.word.start);
        range.setEnd(params.focusNode, params.word.end);
        range.deleteContents();
    }

    return insertDraftBlock(params.text);
}

export function enableQuickButton () {
    document.body.dataset.gorgiasButton = 'true';
}

export function isQuickButtonEnabled () {
    return !!document.body.dataset.gorgiasButton;
}
