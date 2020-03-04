/*
 * Generic methods for autocompletion
 */

import $ from 'jquery';

import {register, run as runPlugins} from './plugin';
import gmailPlugin from './plugins/gmail';
import facebookPlugin from './plugins/facebook';
import fastmailPlugin from './plugins/fastmail';
import linkedinPlugin from './plugins/linkedin';
import outlookPlugin from './plugins/outlook';
import yahooPlugin from './plugins/yahoo';
import zendeskPlugin from './plugins/zendesk';
import draftPlugin from './plugins/draft';
import prosemirrorPlugin from './plugins/prosemirror';
import crmPlugin from './plugins/crm';
import genericPlugin from './plugins/generic';

var autocomplete = {};

autocomplete.quicktexts = [];
autocomplete.cursorPosition = null;

autocomplete.isEditable = function (element) {

    var isTextfield = (element.tagName.toLowerCase() === 'input');
    var isTextarea = (element.tagName.toLowerCase() === 'textarea');
    var isContenteditable = autocomplete.isContentEditable(element);

    return (isTextfield || isTextarea || isContenteditable);

};

autocomplete.isContentEditable = function (element) {
    return element && element.hasAttribute('contenteditable');
};

autocomplete.getSelectedWord = function (params) {
    var doc = params.element.ownerDocument;

    var word = {
        start: 0,
        end: 0,
        text: ''
    };

    var beforeSelection = "";
    var selection = doc.getSelection();

    if (autocomplete.isContentEditable(params.element)) {
        switch (selection.focusNode.nodeType) {
            // In most cases, the focusNode property refers to a Text Node.
            case (document.TEXT_NODE): // for text nodes it's easy. Just take the text and find the closest word
                beforeSelection = selection.focusNode.textContent;
                break;
            // However, in some cases it may refer to an Element Node
            case (document.ELEMENT_NODE):
                // In that case, the focusOffset property returns the index in the childNodes collection of the focus node where the selection ends.
                if (
                    // focusOffset is larger than childNodes length when editor is empty
                    selection.focusNode.childNodes[selection.focusOffset]
                ) {
                    beforeSelection = selection.focusNode.childNodes[selection.focusOffset].textContent;
                }
                break;
        }
    } else {
        beforeSelection = $(params.element).val().substr(0, autocomplete.cursorPosition.end);
    }

    // Replace all &nbsp; with normal spaces
    beforeSelection = beforeSelection.replace('\xa0', ' ').trim();

    word.start = Math.max(beforeSelection.lastIndexOf(" "), beforeSelection.lastIndexOf("\n"), beforeSelection.lastIndexOf("<br>")) + 1;
    word.text = beforeSelection.substr(word.start);
    word.end = word.start + word.text.length;
    return word;
};

autocomplete.getCursorPosition = function (element) {
    var doc = element.ownerDocument;

    if (!element) {
        return false;
    }

    var position = {
        element: element || null,
        offset: 0,
        absolute: {
            left: 0,
            top: 0
        },
        word: null
    };

    var $caret;

    var getRanges = function (sel) {
        if (sel.rangeCount) {
            var ranges = [];
            for (var i = 0; i < sel.rangeCount; i++) {
                ranges.push(sel.getRangeAt(i));
            }
            return ranges;
        }
        return [];
    };

    var restoreRanges = function (sel, ranges) {
        for (var i in ranges) {
            sel.addRange(ranges[i]);
        }
    };

    if (autocomplete.isContentEditable(position.element)) {
        // Working with editable div
        // Insert a virtual cursor, find its position
        // http://stackoverflow.com/questions/16580841/insert-text-at-caret-in-contenteditable-div

        var selection = doc.getSelection();
        // get the element that we are focused + plus the offset
        // Read more about this here: https://developer.mozilla.org/en-US/docs/Web/API/Selection.focusNode
        position.element = selection.focusNode;
        position.offset = selection.focusOffset;

        // First we get all ranges (most likely just 1 range)
        var ranges = getRanges(selection);
        var focusNode = selection.focusNode;
        var focusOffset = selection.focusOffset;

        if (!ranges.length) {
            return;
        }
        // remove any previous ranges
        selection.removeAllRanges();

        // Added a new range to place the caret at the focus point of the cursor
        var range = new Range();
        var caretText = '<span id="qt-caret"></span>';
        range.setStart(focusNode, focusOffset);
        range.setEnd(focusNode, focusOffset);
        range.insertNode(range.createContextualFragment(caretText));
        selection.addRange(range);
        selection.removeAllRanges();

        // finally we restore all the ranges that we had before
        restoreRanges(selection, ranges);

        // Virtual caret
        $caret = $('#qt-caret');

        if ($caret.length) {

            position.absolute = $caret.offset();
            position.absolute.width = $caret.width();
            position.absolute.height = $caret.height();

            // Remove virtual caret
            $caret.remove();
        }

    } else {

        // Working with textarea
        // Create a mirror element, copy textarea styles
        // Insert text until selectionEnd
        // Insert a virtual cursor and find its position

        position.start = position.element.selectionStart;
        position.end = position.element.selectionEnd;

        var $mirror = $('<div id="qt-mirror" class="qt-mirror"></div>').addClass(position.element.className),
            $source = $(position.element),
            $sourcePosition = $source.offset();

        // copy all styles
        for (var i in autocomplete.mirrorStyles) {
            var style = autocomplete.mirrorStyles[i];
            $mirror.css(style, $source.css(style));
        }

        var sourceMetrics = $source.get(0).getBoundingClientRect();

        // set absolute position
        $mirror.css({
            top: $sourcePosition.top + 'px',
            left: $sourcePosition.left + 'px',
            width: sourceMetrics.width,
            height: sourceMetrics.height
        });

        // copy content
        $mirror.html($source.val().substr(0, position.end).split("\n").join('<br>'));
        $mirror.append('<span id="qt-caret" class="qt-caret"></span>');

        // insert mirror
        $('body').append($mirror);

        $caret = $('#qt-caret', $mirror);

        position.absolute = $caret.offset();
        position.absolute.width = $caret.width();
        position.absolute.height = $caret.height();

        $mirror.remove();

    }
    return position;
};

autocomplete.replaceWith = function (params) {
    var word = autocomplete.cursorPosition.word;

    runPlugins(Object.assign(
        {},
        params,
        {
            word: word,
        }
    ));

    // updates stats
    window.App.settings.stats('words', params.quicktext.body.split(' ').length, () => {});
};

// Mirror styles are used for creating a mirror element in order to track the cursor in a textarea
autocomplete.mirrorStyles = [
    // Box Styles.
    'box-sizing', 'height', 'width', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'border-width',
    // Font stuff.
    'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
    // Spacing etc.
    'word-spacing', 'letter-spacing', 'line-height', 'text-decoration', 'text-indent', 'text-transform',
    // The direction.
    'direction'
];


register(gmailPlugin);
register(facebookPlugin);
register(fastmailPlugin);
register(linkedinPlugin);
register(outlookPlugin);
register(yahooPlugin);
register(zendeskPlugin);
register(draftPlugin);
register(prosemirrorPlugin);
register(crmPlugin);
register(genericPlugin);

export default autocomplete;
