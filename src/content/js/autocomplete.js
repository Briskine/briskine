/*
 * This is where the actual completion is happening
 */

// Mirror styles are used for creating a mirror element in order to track the
// cursor in a textarea
var mirrorStyles = [
        // Box Styles.
        'box-sizing', 'height', 'width', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'margin-top',
        'margin-bottom', 'margin-left', 'margin-right', 'border-width',
        // Font stuff.
        'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
        // Spacing etc.
        'word-spacing', 'letter-spacing', 'line-height', 'text-decoration', 'text-indent', 'text-transform',
        // The direction.
        'direction'
    ],
    KEY_TAB = 9,
    KEY_SHIFT = 16,
    KEY_ENTER = 13,
    KEY_ESCAPE = 27,
    KEY_UP = 38,
    KEY_DOWN = 40;

App.autocomplete.isActive = false;
App.autocomplete.$dropdown = null;
App.autocomplete.isEmpty = null;
App.autocomplete.quicktexts = [];
App.autocomplete.cursorPosition = null;
App.autocomplete.shiftKey = false;
App.autocomplete.timeoutId = null;

PubSub.subscribe('focus', function (action, element, gmailView) {
    if (action === 'off') {
        App.autocomplete.close();
    }
});

App.autocomplete.onKeyDown = function (e) {
    if (e.keyCode === KEY_SHIFT) {
        App.autocomplete.shiftKey = true;
        return;
    }

    // Press tab while in compose and tab pressed (but not shift+tab)
    if (App.data.inCompose && e.keyCode == KEY_TAB && !App.autocomplete.shiftKey) {
        if (App.autocomplete.isActive) {
            // Simulate closing
            App.autocomplete.close();
            // Do not prevent default
        } else {
            e.preventDefault();
            e.stopPropagation();

            App.autocomplete.onKey(e.keyCode, e);
        }
    }

    // Press control keys when autocomplete is active
    if (App.autocomplete.isActive && ~[KEY_ENTER, KEY_UP, KEY_DOWN].indexOf(e.keyCode)) {
        e.preventDefault();
        e.stopPropagation();

        App.autocomplete.onKey(e.keyCode);
    }

    // Only prevent propagation as we'll handle escape on keyup
    // because well have to set autocomplete.active as false and it will propagate on keyup
    if (App.autocomplete.isActive && e.keyCode == KEY_ESCAPE) {
        e.preventDefault();
        e.stopPropagation();
    }

    // If dropdown is active but the pressed key is different from what we expect
    if (App.autocomplete.isActive && !~[KEY_TAB, KEY_ENTER, KEY_ESCAPE, KEY_UP, KEY_DOWN].indexOf(e.keyCode)) {
        App.autocomplete.close();
    }
};

App.autocomplete.onKeyUp = function (e) {
    if (e.keyCode === KEY_SHIFT) {
        App.autocomplete.shiftKey = false;
        return;
    }

    // Always prevent tab propagation
    if (App.data.inCompose && e.keyCode == KEY_TAB) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (App.autocomplete.isActive) {
        // Just prevent propagation
        if (~[KEY_ENTER, KEY_UP, KEY_DOWN].indexOf(e.keyCode)) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Escape
        if (e.keyCode == KEY_ESCAPE) {
            App.autocomplete.onKey(e.keyCode);
            return;
        }
    }

    if (App.data.inCompose) {
        if (App.autocomplete.justCompleted) {
            App.autocomplete.justCompleted = false;
            return;
        }

        // Try to show the autocomplete dialog (it there is something to show)
        App.settings.getAutocompleteEnabled(function (enabled) { // first make sure it's enabled
            if (!enabled) {
                return;
            }
            App.autocomplete.close();
            window.clearTimeout(App.autocomplete.timeoutId);
            App.settings.getAutocompleteDelay(function (delay) { // get the delay value
                App.autocomplete.timeoutId = window.setTimeout(function () {
                    if (App.data.inCompose) { // before checking make sure we are still inside the compose area
                        App.autocomplete.checkWord(e);
                    }
                }, delay);
            });
        });
    }
};

App.autocomplete.onKey = function (key, e) {
    switch (key) {
        case KEY_TAB:
            this.keyCompletion(e);
            break;
        case KEY_ENTER:
            this.selectActive();
            break;
        case KEY_ESCAPE:
            this.close();
            break;
        case KEY_UP:
            this.changeSelection('prev');
            break;
        case KEY_DOWN:
            this.changeSelection('next');
            break;
    }
};

// TAB completion
App.autocomplete.keyCompletion = function (e) {

    App.autocomplete.cursorPosition = this.getCursorPosition(e);
    var word = this.getSelectedWord(App.autocomplete.cursorPosition);
    App.autocomplete.cursorPosition.word = word;
    if (word.text) {
        App.settings.getQuicktextsShortcut(word.text, function (quicktexts) {
            if (quicktexts.length) {
                // replace with the first quicktext found
                App.autocomplete.replaceWith(quicktexts[0], e);
            } else { // no quicktext found.. focus the next element
                App.autocomplete.focusNext(e.target);
            }
        });
    } else {
        App.autocomplete.focusNext(e.target);
    }
};

App.autocomplete.checkWord = function (e) {
    var cursorPosition = this.getCursorPosition(e);
    this.cursorPosition = cursorPosition;

    // if tab is pressed without any selection
    // just moving the cursor to the send button
    if (cursorPosition.start === 0 && cursorPosition.end === 0) {
        return false;
    }

    var word = this.getSelectedWord(cursorPosition);

    // Cache word
    cursorPosition.word = word;

    var quicktexts = [];


    //TODO: This should probably be done in the background and the results be hold in a cache
    if (word.text !== '') {
        App.settings.getFiltered(word.text, function (quicktexts) {
            App.autocomplete.quicktexts = quicktexts;
            if (App.autocomplete.quicktexts.length) {
                App.autocomplete.dropdownCreate(cursorPosition);
                App.autocomplete.dropdownPopulate(App.autocomplete.quicktexts);
            }
        });
    }
};

// TODO make dropdown position relative so on scrolling it will stay in right place
App.autocomplete.dropdownCreate = function (cursorPosition) {
    var container = $('[id="'+ $(cursorPosition.elementMain).attr('id') + '"]');

    // Add loading dropdown
    this.$dropdown = $('<ul id="qt-dropdown" class="qt-dropdown"><li class="default">Loading...</li></ul>');
    container.after(this.$dropdown);

    this.$dropdown.css({
        top: (cursorPosition.absolute.top + cursorPosition.absolute.height - $(window).scrollTop()) + 'px',
        left: (cursorPosition.absolute.left + cursorPosition.absolute.width - $(window).scrollLeft()) + 'px'
    });

    //HACK: set z-index to auto to a parent, otherwise the autocomplete
    //      dropdown will not be displayed with the correct stacking
    this.$dropdown.parents('.qz').css('z-index', 'auto');

    this.isActive = true;
    this.isEmpty = true;

    // Handle mouse hover and click
    this.$dropdown.on('mouseover mousedown', 'li.qt-item', function (e) {
        e.preventDefault();
        e.stopPropagation();

        App.autocomplete.dropdownSelectItem($(this).index());
        if (e.type === 'mousedown') {
            App.autocomplete.selectActive();
        }
    });
};

App.autocomplete.dropdownPopulate = function (elements) {
    if (!elements.length) {
        return;
    }
    var listElements = "\
    {{#each elements}}\
    <li class='qt-item' data-id='{{id}}'>\
        <span class='qt-shortcut'>{{shortcut}}</span>\
        <span class='qt-title'>{{title}}</span>\
        </li>\
        {{/each}}",
        content = Handlebars.compile(listElements)({elements: elements});

    this.$dropdown.html(content);
    this.isEmpty = false;

    // Set first element active
    this.dropdownSelectItem(0);
};

App.autocomplete.dropdownSelectItem = function (index) {
    if (this.isActive && !this.isEmpty) {
        this.$dropdown.children()
            .removeClass('active')
            .eq(index)
            .addClass('active');
    }
};

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

/*
 Moves focus from editable content to Send button
 */
App.autocomplete.focusNext = function (element) {
    var button;
    if (App.data.gmailView == 'basic html') {
        var elements = $(element).closest('table').find('input,textarea,button');
        button = elements.eq(elements.index(element) + 1);
    } else if (App.data.gmailView === 'standard') {
        button = $(element).closest('table').parent().closest('table').find('[role=button][tabindex="1"]').first();
    }

    if (button.length) {
        button.focus();
    }
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
        for (var i in mirrorStyles) {
            var style = mirrorStyles[i];
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

App.autocomplete.selectActive = function () {
    if (this.isActive && !this.isEmpty && this.quicktexts.length) {
        var activeItemId = this.$dropdown.find('.active').data('id'),
            quicktext = this.getQuicktextById(activeItemId);

        this.replaceWith(quicktext);
    }
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
    App.autocomplete.close();
};

// TODO should request background
App.autocomplete.getQuicktextById = function (id) {
    return this.quicktexts.filter(function (a) {
        return a.id === id;
    })[0];
};

App.autocomplete.close = function () {
    if (App.autocomplete.isActive) {

        this.$dropdown.remove();
        this.$dropdown = null;

        this.isActive = false;
        this.isEmpty = null;

        this.quicktexts = [];
        this.cursorPosition = null;
    }
};

App.autocomplete.changeSelection = function (direction) {
    var index_diff = direction === 'prev' ? -1 : 1,
        elements_count = this.$dropdown.children().length,
        index_active = this.$dropdown.find('.active').index(),
        index_new = Math.max(0, Math.min(elements_count - 1, index_active + index_diff));

    this.dropdownSelectItem(index_new);
};
