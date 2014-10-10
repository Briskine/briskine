/*
 * Generic methods for autocompletion
 */

var KEY_TAB = 9,
    KEY_UP = 38,
    KEY_DOWN = 40,
    KEY_ENTER = 13;

App.autocomplete.quicktexts = [];
App.autocomplete.cursorPosition = null;

App.autocomplete.getSelectedWord = function (cursorPosition) {
    var word = {
        start: 0,
        end: 0,
        text: ''
    };
    var string;

    if (App.data.gmailView === 'basic html') {
        string = $(cursorPosition.element).val().substr(0, cursorPosition.end);
    } else if (App.data.gmailView === 'standard') {
        // Get text from node start until cursorPosition.end
        var range = new Range();
        if (cursorPosition.end > cursorPosition.element.length) {
            cursorPosition.end = cursorPosition.element.length;
        }
        range.setStart(cursorPosition.element, 0);
        range.setEnd(cursorPosition.element, cursorPosition.end);
        string = range.toString();
    }

    // Replace all nbsp with normal spaces
    string = string.replace('\xa0', ' ');

    word.start = Math.max(string.lastIndexOf(" "), string.lastIndexOf("\n")) + 1;
    word.text = string.substr(word.start);
    word.end = word.start + word.text.length;

    return word;
};

App.autocomplete.getCursorPosition = function (e) {
    var target = e && e.target ? e.target : null,
        position = {
            start: 0,
            end: 0,
            absolute: {
                left: 0,
                top: 0
            },
            element: null,
            elementMain: target,
            word: null
        };
    var $caret;

    // Working with textarea
    // Create a mirror element, copy textarea styles
    // Insert text until selectionEnd
    // Insert a virtual cursor and find its position
    if (App.data.gmailView === 'basic html') {
        position.element = e.target;
        position.start = position.element.selectionStart;
        position.end = position.element.selectionEnd;

        var $mirror = $('<div id="qt-mirror" class="qt-mirror"></div>').addClass(position.element.className),
            $source = $(position.element),
            $sourcePosition = $source.position();

        // copy all styles
        for (var i in App.autocomplete.mirrorStyles) {
            var style = App.autocomplete.mirrorStyles[i];
            $mirror.css(style, $source.css(style));
        }

        // set absolute position
        $mirror.css({top: $sourcePosition.top + 'px', left: $sourcePosition.left + 'px'});

        // copy content
        $mirror.html($source.val().substr(0, position.end).split("\n").join('<br>'));
        $mirror.append('<span id="qt-caret" class="qt-caret"></span>');

        // insert mirror
        $mirror.insertAfter($source);

        $caret = $('#qt-caret');
        position.absolute = $caret.offset();
        position.absolute.width = $caret.width();
        position.absolute.height = $caret.height();

        $mirror.remove();

        // Working with editable div
        // Insert a virtual cursor, find its position
        // http://stackoverflow.com/questions/16580841/insert-text-at-caret-in-contenteditable-div
    } else if (App.data.gmailView === 'standard') {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);

        position.element = selection.baseNode;
        position.start = range.startOffset;
        position.end = range.endOffset;

        range.collapse(false);   // collapse at end
        range.deleteContents();

        // Add virtual caret
        range.insertNode(range.createContextualFragment('<span id="qt-caret"></span>'));

        // Virtual caret
        $caret = $('#qt-caret');

        if ($caret.length) {
            // Set caret back at old position
            //TODO: fix this soon! THe caret is not positioned at the right place anyway.
            range = range.cloneRange();
            range.setStartAfter($caret[0]);
            range.collapse(true);
            //selection.removeAllRanges();

            // TODO fix
            // `Discontiguous selection is not supported.`
            // Chrome error.
            // https://code.google.com/p/chromium/issues/detail?id=399791
            // https://code.google.com/p/rangy/issues/detail?id=208

            // Probably, because of this
            // after a word is matched, after adding/deleting extra chars
            // the word does not change, or the popup does not show at all
            selection.addRange(range);

            position.absolute = $caret.offset();
            position.absolute.width = $caret.width();
            position.absolute.height = $caret.height();

            // Remove virtual caret
            $caret.remove();
        }
    }

    return position;
};


App.autocomplete.replaceWith = function (quicktext, event) {
    var cursorPosition = App.autocomplete.cursorPosition,
        word = cursorPosition.word,
        replacement = "";

    App.autocomplete.justCompleted = true; // the idea is that we don't want any completion to popup after we just completed

    if (App.data.gmailView == 'basic html') {
        var $textarea = $(cursorPosition.element),
            value = $textarea.val();

        replacement = Handlebars.compile(quicktext.body)(App.parser.getData(cursorPosition.elementMain));

        var valueNew = value.substr(0, word.start) + replacement + value.substr(word.end),
            cursorOffset = word.start + quicktext.body.length;

        $textarea.val(valueNew);

        // Set focus at the end of patch
        $textarea.focus();
        $textarea[0].setSelectionRange(cursorOffset, cursorOffset);
    } else if (App.data.gmailView === 'standard') {
        var selection = window.getSelection(),
            range = selection.getRangeAt(0);
        replacement = Handlebars.compile(quicktext.body)(App.parser.getData(cursorPosition.elementMain)).replace(/\n/g, '<br>');

        range.setStart(cursorPosition.element, word.start);
        range.setEnd(cursorPosition.element, word.end);
        range.deleteContents();
        range.insertNode(range.createContextualFragment(replacement + '<span id="qt-caret"></span>'));

        // Virtual caret
        // Used to set cursor position in right place
        // TODO find a better method to do that
        var $caret = $('#qt-caret');

        if ($caret.length) {
            // Set caret back at old position
            range = range.cloneRange();
            range.setStartAfter($caret[0]);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            // Remove virtual caret
            $caret.remove();
        }
    }

    // set subject field
    if (quicktext.subject) {
        var $subjectField = $('input[name=subjectbox]');
        $subjectField.val(quicktext.subject);
    }

    // updates stats
    App.settings.stats('words', quicktext.body.split(" ").length, function () {
    });
    App.autocomplete.dialog.close();
};
