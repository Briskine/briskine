/*
 * Generic methods for autocompletion
 */

var KEY_TAB = 9,
    KEY_UP = 38,
    KEY_DOWN = 40,
    KEY_ENTER = 13;

App.autocomplete.quicktexts = [];
App.autocomplete.cursorPosition = null;

App.autocomplete.isEditable = function (element) {

    var isTextfield = (element.tagName.toLowerCase() === 'input');
    var isTextarea = (element.tagName.toLowerCase() === 'textarea');
    var isContenteditable = App.autocomplete.isContentEditable(element);

    return (isTextfield || isTextarea || isContenteditable);

};

App.autocomplete.isContentEditable = function (element) {
    return element && element.hasAttribute('contenteditable');
};

App.autocomplete.getSelectedWord = function (params) {
    var doc = params.element.ownerDocument;

    var word = {
        start: 0,
        end: 0,
        text: ''
    };

    var beforeSelection = "";
    var selection = doc.getSelection();

    if (App.autocomplete.isContentEditable(params.element)) {
        switch (selection.focusNode.nodeType) {
            // In most cases, the focusNode property refers to a Text Node.
            case (document.TEXT_NODE): // for text nodes it's easy. Just take the text and find the closest word
                beforeSelection = selection.focusNode.textContent;
                break;
            // However, in some cases it may refer to an Element Node
            case (document.ELEMENT_NODE):
                // In that case, the focusOffset property returns the index in the childNodes collection of the focus node where the selection ends.
                if (selection.focusNode.childNodes.length) {
                    beforeSelection = selection.focusNode.childNodes[selection.focusOffset].textContent;
                }
                break;
        }
    } else {
        beforeSelection = $(params.element).val().substr(0, App.autocomplete.cursorPosition.end);
    }

    // Replace all &nbsp; with normal spaces
    beforeSelection = beforeSelection.replace('\xa0', ' ').trim();

    word.start = Math.max(beforeSelection.lastIndexOf(" "), beforeSelection.lastIndexOf("\n"), beforeSelection.lastIndexOf("<br>")) + 1;
    word.text = beforeSelection.substr(word.start);
    word.end = word.start + word.text.length;
    return word;
};

App.autocomplete.getCursorPosition = function (element) {
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

    if (App.autocomplete.isContentEditable(position.element)) {
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
            Raven.captureMessage("A selection without any ranges!");
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
        for (var i in App.autocomplete.mirrorStyles) {
            var style = App.autocomplete.mirrorStyles[i];
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

App.autocomplete.replaceWith = function (params) {

    var word = App.autocomplete.cursorPosition.word;
    var replacement = '';

    App.autocomplete.justCompleted = true; // the idea is that we don't want any completion to popup after we just completed

    var setText = function (vars) {
        var doc = params.element.ownerDocument;

        var parsedTemplate = Handlebars.compile(params.quicktext.body)(params.data);

            if (App.autocomplete.isContentEditable(params.element)) {

                var selection = doc.getSelection();
                var range = doc.createRange();

                replacement = parsedTemplate;

                if (!App.settings.editor_enabled) {
                    replacement = replacement.replace(/\n/g, ' <br />\n');
                }
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


                var qtNode = range.createContextualFragment(replacement);
                var lastQtChild = qtNode.lastChild;

                if (params.quicktext.attachments && params.quicktext.attachments.length > 0 && vars && vars.plugin === 'gmail') {
                    if (params.quicktext.attachments.length) //in case there was attachments in that quicktext that have been removed then..
                        params.quicktext.attachments.map(function (attachment, index) {
                            App.activePlugin.setAttachment(attachment, range);
                        });
                }

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
    };

    var insertQt = function (params) {
        return function () {
            setText(params.data);

            if (typeof App.activePlugin.after === 'function') {
                App.activePlugin.after(params);
            }
        };
    };

    App.autocomplete.dialog.close();

    App.activePlugin.getData({
        element: params.element
    }, function (err, vars) {
        // add parsed vars to params
        params.data = PrepareVars(vars);

        if (typeof App.activePlugin.before === 'function') {
            App.activePlugin.before(params, function (err, params) {
                // we need the callback because the editor
                // doesn't get the focus right-away.
                // so window.getSelection() returns the search field
                // in the dialog otherwise, instead of the editor
                App.autocomplete.focusEditor(params.element, insertQt(params));
            });
            return;
        }

        App.autocomplete.focusEditor(params.element, insertQt(params));
    });

    // updates stats
    App.settings.stats('words', params.quicktext.body.split(' ').length, function () {
    });
};

App.autocomplete.focusEditor = function (element, callback) {

    // return focus to the editor

    // gmail auto-focuses the to field
    // so we need the delay
    setTimeout(function () {
        if (element) {
            element.focus();
        }

        if (callback) {
            callback();
        }
    }, 50);

};

// Mirror styles are used for creating a mirror element in order to track the cursor in a textarea
App.autocomplete.mirrorStyles = [
    // Box Styles.
    'box-sizing', 'height', 'width', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'border-width',
    // Font stuff.
    'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
    // Spacing etc.
    'word-spacing', 'letter-spacing', 'line-height', 'text-decoration', 'text-indent', 'text-transform',
    // The direction.
    'direction'
];
