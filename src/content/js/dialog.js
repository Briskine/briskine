/**
 * Autocomplete dialog code.
 */


PubSub.subscribe('focus', function (action, element, gmailView) {
    if (action === 'off' && element !== App.autocomplete.dialog.$search.get(0)) {
        App.autocomplete.dialog.close();
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

    completion: function (e) {

        // only works in compose area
        if (!App.data.inCompose) {
            return true;
        }
        e.preventDefault();
        e.stopPropagation();

        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(e);
        var word = App.autocomplete.getSelectedWord(App.autocomplete.cursorPosition);
        App.autocomplete.cursorPosition.word = word;
        if (word.text) {
            App.autocomplete.dialog.$search.val(word.text); //setup default value if any
        }

        App.settings.getFiltered(word.text, App.autocomplete.dialog.RESULTS_LIMIT, function (quicktexts) {
            App.autocomplete.quicktexts = quicktexts;

            if (App.autocomplete.quicktexts.length) {
                App.autocomplete.dialog.populate(App.autocomplete.quicktexts);
            }
        });

    },
    // TODO(@ghinda): make dropdown position relative so on scrolling it will stay in right place
    create: function () {
        //var container = $('[id="'+ $(cursorPosition.elementMain).attr('id') + '"]');
        var container = $('body');

        // Add loading dropdown
        this.$dialog = $(this.template);
        this.$content = $('.qt-dropdown-content', this.$dialog);
        this.$search = $('.qt-dropdown-search', this.$dialog);

        container.append(this.$dialog);

        //HACK: set z-index to auto to a parent, otherwise the autocomplete
        //      dropdown will not be displayed with the correct stacking
        this.$dialog.parents('.qz').css('z-index', 'auto');

        // Handle mouse hover and click
        this.$dialog.on('mouseover mousedown', 'li.qt-item', function (e) {

            e.preventDefault();
            e.stopPropagation();

            App.autocomplete.dialog.selectItem($(this).index());
            if (e.type === 'mousedown') {
                App.autocomplete.dialog.selectActive();
                //App.autocomplete.dialog.close();
            }
        });

        this.$search.on('keyup', function (e) {
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
            App.autocomplete.dialog.close();
        });
        Mousetrap.bindGlobal('enter', function (e) {
            if (App.autocomplete.dialog.isActive) {
                App.autocomplete.dialog.selectActive();
                App.autocomplete.dialog.close();
            }
        });

    },
    populate: function (quicktexts) {

        App.autocomplete.quicktexts = quicktexts;

        if (App.autocomplete.quicktexts.length && !App.autocomplete.dialog.isActive) {
            App.autocomplete.dialog.show(App.autocomplete.cursorPosition);
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

        clonedElements.forEach(function (elem) {
            elem.title = elem.title.replace(searchRe, highlightMatch);
            elem.originalBody = elem.body;
            elem.body = elem.body.replace(searchRe, highlightMatch);
            elem.shortcut = elem.shortcut.replace(searchRe, highlightMatch);
        });

        var content = Handlebars.compile(App.autocomplete.dialog.liTemplate)({
            elements: clonedElements
        });

        App.autocomplete.dialog.$content.html(content);
        App.autocomplete.dialog.isEmpty = false;

        // Set first element active
        App.autocomplete.dialog.selectItem(0);
    },
    show: function (cursorPosition) {
        // get current focused element - the editor
        App.autocomplete.dialog.editor = document.activeElement;

        App.autocomplete.dialog.isActive = true;
        App.autocomplete.dialog.isEmpty = true;

        App.autocomplete.dialog.$dialog.css({
            top: (cursorPosition.absolute.top + cursorPosition.absolute.height - $(window).scrollTop()) + 'px',
            left: (cursorPosition.absolute.left + cursorPosition.absolute.width - $(window).scrollLeft()) + 'px'
        });

        App.autocomplete.dialog.$dialog.addClass('qt-dropdown-show');
        App.autocomplete.dialog.$search.focus();
    },
    selectItem: function (index) {
        if (App.autocomplete.dialog.isActive && !App.autocomplete.dialog.isEmpty) {
            var $element = App.autocomplete.dialog.$content.children().eq(index);

            App.autocomplete.dialog.$content.children()
                .removeClass('active')
                .eq(index);

            $element.addClass('active');
        }
    },
    selectActive: function () {
        if (App.autocomplete.dialog.isActive && !this.isEmpty && App.autocomplete.quicktexts.length) {
            var activeItemId = App.autocomplete.dialog.$content.find('.active').data('id');
            var quicktext = App.autocomplete.quicktexts.filter(function (quicktext) {
                return quicktext.id === activeItemId;
            })[0];
            App.autocomplete.replaceWith(quicktext);
        }
    },
    changeSelection: function (direction) {
        var index_diff = direction === 'prev' ? -1 : 1,
            elements_count = App.autocomplete.dialog.$content.children().length,
            index_active = App.autocomplete.dialog.$content.find('.active').index(),
            index_new = Math.max(0, Math.min(elements_count - 1, index_active + index_diff));

        App.autocomplete.dialog.selectItem(index_new);

        // scroll the active element into view
        var $element = App.autocomplete.dialog.$content.children().eq(index_new);
        $element.get(0).scrollIntoView();
    },
    // remove dropdown and cleanup
    close: function () {
        if (App.autocomplete.dialog.isActive) {
            $('.qt-dropdown').removeClass('qt-dropdown-show');
            $('.qt-dropdown-search').val('');

            App.autocomplete.dialog.isActive = false;
            App.autocomplete.dialog.isEmpty = null;

            App.autocomplete.dialog.quicktexts = [];
            App.autocomplete.dialog.cursorPosition = null;

            // return focus to the editor
            if(App.autocomplete.dialog.editor) {
                // chrome focuses the to field
                // so we need the delay
                setTimeout(function() {
                    App.autocomplete.dialog.editor.focus();
                }, 50);
            }
        }
    }
};

App.autocomplete.dialog.template = '' +
    '<div class="qt-dropdown">' +
    '<input type="search" class="qt-dropdown-search" value="" placeholder="Search quicktexts..">' +
    '<ul class="qt-dropdown-content"></ul>' +
    '</div>' +
    '';

App.autocomplete.dialog.liTemplate = '' +
    '{{#if elements.length}}' +
    '{{#each elements}}' +
    '<li class="qt-item" data-id="{{id}}" title="{{{originalBody}}}">' +
    '<span class="qt-title">{{{title}}}</span>' +
    '<span class="qt-shortcut">{{{shortcut}}}</span>' +
    '<span class="qt-body">{{{body}}}</span>' +
    '</li>' +
    '{{/each}}' +
    '{{else}}' +
    '<li class="qt-blank-state">' +
    'No quicktexts found.' +
    '</li>' +
    '{{/if}}' +
    '';

