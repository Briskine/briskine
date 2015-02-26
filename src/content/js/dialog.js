/**
 * Autocomplete dialog code.
 */


PubSub.subscribe('focus', function (action, element) {
    if (action === 'off') {
        if (element === null) {
            App.autocomplete.dialog.close();
        } else if ($(element).attr('class') !== $(App.autocomplete.dialog.searchSelector).attr('class')) {
            App.autocomplete.dialog.close();
        }
    }
});

App.autocomplete.dialog = {
    // Mirror styles are used for creating a mirror element in order to track the cursor in a textarea
    mirrorStyles: [
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
    isActive: false,
    isEmpty: true,
    RESULTS_LIMIT: 5, // only show 5 results at a time
    editor: null,
    qaBtn: null,
    prevFocus: null,
    dialogSelector: ".qt-dropdown",
    contentSelector: ".qt-dropdown-content",
    searchSelector: ".qt-dropdown-search",

    completion: function (e) {
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();

        var element = e.target;

        // if it's not an editable element
        // don't trigger anything
        if(!App.autocomplete.isEditable(element)) {
            return false;
        }

        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(e);
        var word = App.autocomplete.getSelectedWord({
            element: element
        });

        App.autocomplete.cursorPosition.word = word;

        App.settings.getFiltered("", App.autocomplete.dialog.RESULTS_LIMIT, function (quicktexts) {
            App.autocomplete.quicktexts = quicktexts;

            App.autocomplete.dialog.populate(App.autocomplete.quicktexts);
        });

    },
    create: function () {

        // Create only once in the root of the document
        var container = $('body');

        // Add loading dropdown
        var dialog = $(this.template);
        container.append(dialog);

        // add the dialog quick access icon
        this.qaBtn = $(this.qaBtnTemplate);
        container.append(this.qaBtn);

        //Gmail HACK: set z-index to auto to a parent, otherwise the autocomplete
        //      dropdown will not be displayed with the correct stacking
        dialog.parents('.qz').css('z-index', 'auto');

        // Handle mouse hover and click
        dialog.on('mouseover mousedown', 'li.qt-item', function (e) {
            e.preventDefault();
            e.stopPropagation();

            App.autocomplete.dialog.selectItem($(this).index());
            if (e.type === 'mousedown') {
                App.autocomplete.dialog.selectActive();
                //App.autocomplete.dialog.close();
            }
        });

        dialog.on('keyup', this.searchSelector, function (e) {
            // ignore modifier keys because they manipulate
            if (_.contains([KEY_ENTER, KEY_UP, KEY_DOWN], e.keyCode)) {
                return;
            }

            App.autocomplete.cursorPosition.word.text = $(this).val();

            App.settings.getFiltered(App.autocomplete.cursorPosition.word.text, App.autocomplete.dialog.RESULTS_LIMIT, function (quicktexts) {

                App.autocomplete.quicktexts = quicktexts;
                App.autocomplete.dialog.populate(App.autocomplete.quicktexts);

            });
        });

        // when scrolling the element or the page
        // set the autocomplete dialog position
        window.addEventListener('scroll', App.autocomplete.dialog.setDialogPosition);

        // move the quick access button around
        // to the focused text field
        // the focus event doesn't support bubbling
        container.on('focusin', this.setQaBtnPosition);

        this.qaBtn.on('mouseup', function() {

            // return the focus to the element focused
            // before clicking the qa button
            App.autocomplete.dialog.prevFocus.focus();

            App.settings.getFiltered('', App.autocomplete.dialog.RESULTS_LIMIT, function (quicktexts) {
                App.autocomplete.quicktexts = quicktexts;

                // TODO find a way to position the dialog under the qa button
                // not next to the last focused position

                // hack the event param to pass a different element
                App.autocomplete.dialog.completion({
                    target: App.autocomplete.dialog.prevFocus
                });
            });

        });

    },
    bindKeyboardEvents: function () {
        Mousetrap.bindGlobal('up', function (e) {
            if (App.autocomplete.dialog.isActive) {
                App.autocomplete.dialog.changeSelection('prev');
            }
        });
        Mousetrap.bindGlobal('down', function (e) {
            if (App.autocomplete.dialog.isActive) {
                App.autocomplete.dialog.changeSelection('next');
            }
        });
        Mousetrap.bindGlobal('escape', function (e) {
            if (App.autocomplete.dialog.isActive) {
                App.autocomplete.dialog.close();
                App.autocomplete.focusEditor(App.autocomplete.dialog.editor);

                // restore the previous caret position
                // since we didn't select any quicktext
                var selection = window.getSelection();
                var caretRange = document.createRange();
                caretRange.setStartAfter(App.autocomplete.dialog.focusNode);
                caretRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(caretRange);
            }
        });
        Mousetrap.bindGlobal('enter', function (e) {
            if (App.autocomplete.dialog.isActive) {
                App.autocomplete.dialog.selectActive();
                App.autocomplete.dialog.close();
                App.autocomplete.focusEditor(App.autocomplete.dialog.editor);
            }
        });

    },
    populate: function (quicktexts) {
        App.autocomplete.quicktexts = quicktexts;
        if (!App.autocomplete.dialog.isActive) {
            App.autocomplete.dialog.show();
        }


        // clone the elements
        // so we can safely highlight the matched text
        // without breaking the generated handlebars markup
        var clonedElements = jQuery.extend(true, [], App.autocomplete.quicktexts);

        // highlight found string in element title, body and shortcut
        var searchRe = new RegExp(App.autocomplete.cursorPosition.word.text, 'gi');

        var highlightMatch = function (match) {
            return '<span class="qt-search-highlight">' + match + '</span>';
        };

        // only match if we have a search string
        if(App.autocomplete.cursorPosition.word.text) {
            clonedElements.forEach(function (elem) {
                elem.title = elem.title.replace(searchRe, highlightMatch);
                elem.originalBody = elem.body;
                elem.body = elem.body.replace(searchRe, highlightMatch);
                elem.shortcut = elem.shortcut.replace(searchRe, highlightMatch);
            });
        }

        var content = Handlebars.compile(App.autocomplete.dialog.liTemplate)({
            elements: clonedElements
        });

        $(this.contentSelector).html(content);
        App.autocomplete.dialog.isEmpty = false;

        // Set first element active
        App.autocomplete.dialog.selectItem(0);
    },
    show: function (params) {
        params = params || {};

        // get current focused element - the editor
        App.autocomplete.dialog.editor = document.activeElement;

        var selection = window.getSelection();
        var focusNode = selection.focusNode;
        App.autocomplete.dialog.focusNode = focusNode;

        App.autocomplete.dialog.isActive = true;
        App.autocomplete.dialog.isEmpty = true;

        $(this.dialogSelector).addClass('qt-dropdown-show');
        $(this.searchSelector).focus();
        $(App.autocomplete.dialog.contentSelector).scrollTop();

        if(!params.skipPositioning) {
            App.autocomplete.dialog.setDialogPosition();

            // if we scroll the content element

            // remove it just in case we added it previously
            App.autocomplete.dialog.editor.removeEventListener('scroll', App.autocomplete.dialog.setDialogPosition);

            App.autocomplete.dialog.editor.addEventListener('scroll', App.autocomplete.dialog.setDialogPosition);
        }

    },
    setDialogPosition: function() {
        
        if(!App.autocomplete.dialog.isActive) {
            return;
        }

        var dialogMaxHeight = 250;
        var pageHeight = window.innerHeight;
        var scrollTop = $(window).scrollTop();
        var scrollLeft = $(window).scrollLeft();
        
        scrollTop += $(App.autocomplete.dialog.editor).scrollTop();
        scrollLeft += $(App.autocomplete.dialog.editor).scrollLeft();

        var topPos = App.autocomplete.cursorPosition.absolute.top + App.autocomplete.cursorPosition.absolute.height;
        var bottomPos = 'auto';
        var leftPos = App.autocomplete.cursorPosition.absolute.left + App.autocomplete.cursorPosition.absolute.width - scrollLeft;

        // check if we have enough space at the bottom
        // for the maximum dialog height
        if((pageHeight - App.autocomplete.cursorPosition.absolute.top) < dialogMaxHeight) {
            topPos = 'auto';
            bottomPos = pageHeight - App.autocomplete.cursorPosition.absolute.top + scrollTop;
        } else {
            topPos = topPos - scrollTop;
        }

        $(App.autocomplete.dialog.dialogSelector).css({
            top: topPos,
            bottom: bottomPos,
            left: leftPos
        });

    },
    selectItem: function (index) {
        if (App.autocomplete.dialog.isActive && !App.autocomplete.dialog.isEmpty) {
            var content = $(this.contentSelector);
            var $element = content.children().eq(index);

            content.children()
                .removeClass('active')
                .eq(index);

            $element.addClass('active');
        }
    },
    selectActive: function () {
        if (App.autocomplete.dialog.isActive && !this.isEmpty && App.autocomplete.quicktexts.length) {
            var activeItemId = $(this.contentSelector).find('.active').data('id');
            var quicktext = App.autocomplete.quicktexts.filter(function (quicktext) {
                return quicktext.id === activeItemId;
            })[0];

            App.autocomplete.replaceWith({
                element: App.autocomplete.dialog.editor,
                quicktext: quicktext,
                focusNode: App.autocomplete.dialog.focusNode
            });
        }
    },
    changeSelection: function (direction) {
        var index_diff = direction === 'prev' ? -1 : 1,
            content = $(this.contentSelector),
            elements_count = content.children().length,
            index_active = content.find('.active').index(),
            index_new = Math.max(0, Math.min(elements_count - 1, index_active + index_diff));

        App.autocomplete.dialog.selectItem(index_new);

        // scroll the active element into view
        var $element = content.children().eq(index_new);
        $element.get(0).scrollIntoView();
    },
    // remove dropdown and cleanup
    close: function (callback) {
        if(!App.autocomplete.dialog.isActive) {

            return;

            /*
            if(callback) {
                return callback();
            }
            */

        }

        $(this.dialogSelector).removeClass('qt-dropdown-show');
        $(this.searchSelector).val('');

        App.autocomplete.dialog.isActive = false;
        App.autocomplete.dialog.isEmpty = null;

        App.autocomplete.dialog.quicktexts = [];
        App.autocomplete.dialog.cursorPosition = null;

    },
    showQaForElement: function(elem) {

        var show = true;

        // if the element is not a textarea or contenteditable
        // TODO should we also use it on input[type=text]?
        if(!elem.tagName.toLowerCase() in {
            'textarea': '',
            'contenteditable': ''
        }) {
            show = false;
        }

        // if the quick access button is focused/clicked
        if(elem.className.indexOf('gorgias-qa-btn') !== -1) {
            show = false;
        }

        // if the dialog search field is focused
        if(elem.className.indexOf('qt-dropdown-search') !== -1) {
            show = false;
        }

        return show;

    },
    setQaBtnPosition: function(e) {

        var textfield = e.target;

        // only show it for valid elements
        if(!App.autocomplete.dialog.showQaForElement(textfield)) {
            return false;
        }

        App.autocomplete.dialog.prevFocus = textfield;

        var qaBtn = App.autocomplete.dialog.qaBtn.get(0);

        // padding from the top-right corner of the textfield
        var padding = 5;

        var metrics = {
            top: textfield.offsetTop + padding,
            left: textfield.offsetLeft - padding
        };

        // move the quick access button to the right
        // of the textfield
        metrics.left += textfield.offsetWidth - qaBtn.offsetWidth;

        // move the btn using transforms
        // for performance
        var transform = 'translate3d(' + metrics.left + 'px, ' + metrics.top + 'px, 0)';

        qaBtn.style.transform = transform;
        qaBtn.style.msTransform = transform;
        qaBtn.style.mozTransform = transform;
        qaBtn.style.webkitTransform = transform;

    }
};

App.autocomplete.dialog.template = '' +
    '<div class="qt-dropdown">' +
    '<input type="search" class="qt-dropdown-search" value="" placeholder="Search templates...">' +
    '<ul class="qt-dropdown-content"></ul>' +
    '</div>' +
    '';

// quick access button for the dialog
App.autocomplete.dialog.qaBtnTemplate = '' +
    '<button class="gorgias-qa-btn"></button>' +
    '';

App.autocomplete.dialog.liTemplate = '' +
    '{{#if elements.length}}' +
    '{{#each elements}}' +
    '<li class="qt-item" data-id="{{id}}" title="{{{originalBody}}}">' +
    '<span class="qt-title">{{{title}}}</span>' +
    '{{#if this.shortcut}}' +
    '<span class="qt-shortcut">{{{this.shortcut}}}</span>' +
    '{{/if}}' +
    '<span class="qt-body">{{{body}}}</span>' +
    '</li>' +
    '{{/each}}' +
    '{{else}}' +
    '<li class="qt-blank-state">' +
    'No templates found.' +
    '</li>' +
    '{{/if}}' +
    '';

