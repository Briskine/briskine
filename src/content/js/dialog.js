/**
 * Autocomplete dialog code.
 */

/*
 * This is how the postMessage functionality works,
 * in an iframe scenario:

window.top        |   iframe
------------------+---------------------
click qabtn       ->
                  |  dialog.completion
dialog.populate  <-
                  |
click dialog qt   ->
                  |  dialog.selectActive

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
    isActive: false,
    isEmpty: true,
    RESULTS_LIMIT: 5, // only show 5 results at a time
    editor: null,
    dialogSelector: '.qt-dropdown',
    contentSelector: '.qt-dropdown-content',
    searchSelector: '.qt-dropdown-search',
    newTemplateSelector: '.g-new-template',
    qaBtnSelector: '.gorgias-qa-btn',
    suggestedTemplates: [],
    suggestionHidden: false,
    childWindow: window,

    completion: function (params) {
        params = params || {};
        var element = this.editor;

        // if it's not an editable element
        // don't trigger anything
        if (!App.autocomplete.isEditable(element)) {
            return false;
        }

        // make sure the focus is on the element, before getting its selection.
        // hack because both getCursorPosition and getSelectedWord depend on the
        // editor being focused
        if(document.activeElement !== element) {
            element.focus();
        }

        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(element);
        App.autocomplete.cursorPosition.word = App.autocomplete.getSelectedWord({
            element: element
        });

        if (params.source !== 'button') {
            params.metrics = App.autocomplete.cursorPosition.absolute;
        }

        App.settings.getFiltered('', App.autocomplete.dialog.RESULTS_LIMIT, function (quicktexts) {
            params.quicktexts = quicktexts;
            params.action = 'g-dialog-populate';

            window.top.postMessage(params, '*');
        });

    },
    create: function () {
        // Create only once in the root of the document
        var container = $('body');

        // Add loading dropdown
        var dialog = $(this.template);
        container.append(dialog);

        //Gmail HACK: set z-index to auto to a parent, otherwise the autocomplete
        //      dropdown will not be displayed with the correct stacking
        dialog.parents('.qz').css('z-index', 'auto');

        // Handle mouse hover and click
        dialog.on('mouseover mousedown', '.qt-item', function (e) {
            e.preventDefault();
            e.stopPropagation();

            App.autocomplete.dialog.selectItem($(this).index('.qt-item'));
            if (e.type === 'mousedown') {
                App.autocomplete.dialog.childWindow.postMessage({
                    action: 'g-dialog-select-active',
                    quicktext: App.autocomplete.dialog.getActiveQt()
                }, '*');

                App.autocomplete.dialog.close();
            }
        });

        $(App.autocomplete.dialog.newTemplateSelector).on('mousedown', function () {
            chrome.runtime.sendMessage({'request': 'new'});
        });

        dialog.on('keyup', this.searchSelector, function (e) {
            // ignore modifier keys because they manipulate
            if (_.contains([KEY_ENTER, KEY_UP, KEY_DOWN], e.keyCode)) {
                return;
            }

            App.autocomplete.cursorPosition.word.text = $(this).val();
            App.autocomplete.dialog.suggestionHidden = App.autocomplete.cursorPosition.word.text ? true : false;

            App.settings.getFiltered(App.autocomplete.cursorPosition.word.text, App.autocomplete.dialog.RESULTS_LIMIT, function (quicktexts) {
                // if the dialog was closed before we got the results
                // leave it alone
                if(App.autocomplete.dialog.isActive) {
                    App.autocomplete.quicktexts = quicktexts;
                    App.autocomplete.dialog.populate({
                        data: {
                            quicktexts: quicktexts
                        }
                    });
                }
            });
        });

    },
    bindKeyboardEvents: function (doc) {
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

                App.autocomplete.dialog.childWindow.postMessage({
                    action: 'g-dialog-restore-selection'
                }, '*');
            }
        });
        Mousetrap.bindGlobal('enter', function (e) {
            if (App.autocomplete.dialog.isActive) {
                App.autocomplete.dialog.childWindow.postMessage({
                    action: 'g-dialog-select-active',
                    quicktext: App.autocomplete.dialog.getActiveQt()
                }, '*');

                App.autocomplete.dialog.close();
            }
        });

    },
    getActiveQt: function() {
        var activeItemId = $(this.contentSelector).find('.active').data('id');
        var quicktext = App.autocomplete.quicktexts.filter(function (quicktext) {
            return quicktext.id === activeItemId;
        })[0];
        return quicktext;
    },
    populate: function (res) {
        res = res || {};
        params = res.data || {};
        var i;

        App.autocomplete.quicktexts = params.quicktexts;

        if (App.autocomplete.dialog.suggestedTemplates.length && !App.autocomplete.dialog.suggestionHidden) {

            var found = false;
            for (i in App.autocomplete.quicktexts) {
                var t = App.autocomplete.quicktexts[i];
                for (var j in App.autocomplete.dialog.suggestedTemplates) {
                    var s = App.autocomplete.dialog.suggestedTemplates[j];
                    if (t.id === s.id) {
                        App.autocomplete.quicktexts.splice(i, 1);
                        // insert at the beginning
                        App.autocomplete.quicktexts.splice(0, 1, s);
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                } else {
                    for (var k in App.autocomplete.dialog.suggestedTemplates) {
                        App.autocomplete.quicktexts.splice(0, 1, App.autocomplete.dialog.suggestedTemplates[k]);
                    }
                }
            }
        }

        // clone the elements
        // so we can safely highlight the matched text
        // without breaking the generated handlebars markup
        var clonedElements = jQuery.extend(true, [], App.autocomplete.quicktexts);

        // highlight found string in element title, body and shortcut
        var word_text = '';
        var text = '';
        if (App.autocomplete.cursorPosition.word.text) {
            word_text = App.autocomplete.cursorPosition.word.text;
            text = word_text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }
        var searchRe = new RegExp(text, 'gi');

        var highlightMatch = function (match) {
            return '<span class="qt-search-highlight">' + match + '</span>';
        };

        var stripHtml = function (html) {
            try {
                var doc = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
                doc.documentElement.innerHTML = html;
                return doc.documentElement.textContent||doc.documentElement.innerText;
            } catch(e) {
                return "";
            }
        };

        clonedElements.forEach(function (elem) {
            elem.originalTitle = elem.title;
            elem.originalBody = stripHtml(elem.body);

            // only match if we have a search string
            if (word_text) {
                elem.title = elem.title.replace(searchRe, highlightMatch);
                elem.body = elem.originalBody.replace(searchRe, highlightMatch);
                elem.shortcut = elem.shortcut.replace(searchRe, highlightMatch);
            } else {
                elem.body = elem.originalBody;
            }
        });

        var content = Handlebars.compile(App.autocomplete.dialog.liTemplate)({
            elements: clonedElements
        });

        $(this.contentSelector).html(content);

        if (!App.autocomplete.dialog.isActive) {
            // if the event came from an iframe,
            // find the iframe dom node where it came from,
            // get its positions and merge them with the textfield position
            if(window !== res.source && params.source !== 'button') {
                var iframes = document.querySelectorAll('iframe');
                for(i = 0; i < iframes.length; i++) {
                    // found the iframe where the event came from
                    if(iframes[i].contentWindow === res.source) {
                        // add the extra x/y to it
                        var rect = iframes[i].getBoundingClientRect();
                        params.metrics.left += rect.left;
                        params.metrics.top += rect.top;
                        break;
                    }
                }
            }

            App.autocomplete.dialog.show(params);
        }

        App.autocomplete.dialog.isEmpty = false;

        // Set first element active
        App.autocomplete.dialog.selectItem(0);

    },
    fetchSuggestions: function (target) {
        App.settings.isLoggedIn(function (isLoggedIn) {
            App.autocomplete.dialog.suggestedTemplates = [];
            $('.gorgias-qa-btn-badge').css('display', 'none');

            if (!(isLoggedIn && App.settings.suggestions_enabled)) {
                return;
            }

            // Awesome selectors right?
            var body_text = $(target).closest('.nH .h7').find('.ii.gt:visible').text().trim();
            if (body_text) {
                chrome.runtime.sendMessage({
                    'request': 'suggestion',
                    'data': {
                        'subject': $('.hP').text(),
                        'to': '',
                        'cc': '',
                        'bcc': '',
                        'from': '',
                        'body': body_text
                    }
                }, function (templates) {
                    if (!_.size(templates)) {
                        return;
                    }

                    var template_id = _.keys(templates)[0];
                    for (var remote_id in templates) {
                        if (templates[remote_id] > templates[template_id]) {
                            template_id = remote_id;
                        }
                    }

                    TemplateStorage.get(null, function (storedTemplates) {
                        for (var tid in storedTemplates) {
                            var t = storedTemplates[tid];
                            if (t.remote_id === template_id) {
                                $('.gorgias-qa-btn-badge').css('display', 'block');

                                t.score = templates[template_id];

                                App.autocomplete.dialog.suggestedTemplates.push(t);
                                break;
                            }
                        }
                    });
                });
            }
        });
    },
    show: function (params) {
        params = params || {};

        // used when restoring selection (eg. close dialog with Esc)
        // so we can restore the cursor to the exact previous position.
        App.autocomplete.dialog.focusNode = window.getSelection().focusNode;

        App.autocomplete.dialog.isActive = true;
        App.autocomplete.dialog.isEmpty = true;

        $(this.dialogSelector).addClass('qt-dropdown-show');

        $(App.autocomplete.dialog.contentSelector).scrollTop();

        App.autocomplete.dialog.setPosition(params);

        // focus the input focus after setting the position
        // because it messes with the window scroll focused
        $(App.autocomplete.dialog.searchSelector).focus();

        chrome.runtime.sendMessage({
            'request': 'track',
            'event': 'Showed dialog',
            'data': {
                source: params.source ? params.source : 'keyboard'
            }
        });
    },
    setPosition: function (params) {
        params = params || {};

        if (!App.autocomplete.dialog.isActive) {
            return;
        }

        var paddingTop = 1;
        var dialogMaxHeight = 250;
        var pageHeight = window.innerHeight;
        var scrollTop = $(window).scrollTop();
        var scrollLeft = $(window).scrollLeft();

        $('body').removeClass('qt-dropdown-show-top');

        var $dialog = $(this.dialogSelector);

        var dialogMetrics = $dialog.get(0).getBoundingClientRect();

        var topPos = 0;
        var leftPos = 0;

        // in case we want to position the dialog next to
        // the qa-button
        if (params.source === 'button') {
            var positionNode =  document.querySelector(this.qaBtnSelector);

            params.metrics = positionNode.getBoundingClientRect();

            leftPos -= dialogMetrics.width;

            // because we use getBoundingClientRect
            // we need to add the scroll position
            topPos += scrollTop;
            leftPos += scrollLeft;

            // the default params.metrics (cursorPosition)
            // don't need scrollTop/Left
            // because they use the absolute page offset positions
        }

        topPos += params.metrics.top + params.metrics.height;
        leftPos += params.metrics.left + params.metrics.width;

        topPos += paddingTop;

        // check if we have enough space at the bottom
        // for the maximum dialog height
        if ((pageHeight - (topPos - scrollTop)) < dialogMaxHeight) {

            topPos -= dialogMetrics.height;
            topPos -= params.metrics.height;

            topPos -= paddingTop * 2;

            // add class for qa button styling
            $('body').addClass('qt-dropdown-show-top');

        }

        $dialog.css({
            top: topPos,
            left: leftPos
        });

    },
    selectItem: function (index) {
        if (App.autocomplete.dialog.isActive && !App.autocomplete.dialog.isEmpty) {
            var content = $(this.contentSelector);
            var $element = content.children('.qt-item').eq(index);

            content.children('.qt-item').removeClass('active');

            $element.addClass('active');
        }
    },
    selectActive: function (params) {
        var quicktext = params.quicktext;
        App.autocomplete.replaceWith({
            element: App.autocomplete.dialog.editor,
            quicktext: quicktext
        });

        chrome.runtime.sendMessage({
            'request': 'track',
            'event': 'Inserted template',
            'data': {
                "id": quicktext.id,
                "source": "dialog",
                "title_size": quicktext.title.length,
                "body_size": quicktext.body.length,
                "suggested": quicktext.score ? true : false
            }
        });
    },
    changeSelection: function (direction) {
        var index_diff = direction === 'prev' ? -1 : 1,
            content = $(this.contentSelector),
            elements_count = content.children('.qt-item').length,
            index_active = content.find('.active').index('.qt-item'),
            index_new = Math.max(0, Math.min(elements_count - 1, index_active + index_diff));

        App.autocomplete.dialog.selectItem(index_new);

        // scroll the active element into view
        var $element = content.children('.qt-item').eq(index_new);
        $element.get(0).scrollIntoView();
    },
    // remove dropdown and cleanup
    close: function () {
        if (!App.autocomplete.dialog.isActive) {
            return;
        }

        $(this.dialogSelector).removeClass('qt-dropdown-show');
        $(document.body).removeClass('qt-dropdown-show-top');
        $(this.searchSelector).val('');

        App.autocomplete.dialog.isActive = false;
        App.autocomplete.dialog.isEmpty = null;

        App.autocomplete.dialog.quicktexts = [];
        App.autocomplete.dialog.cursorPosition = null;

    },
    restoreSelection: function() {
        // restore the previous caret position
        // since we didn't select any quicktext
        var selection = document.getSelection();
        var caretRange = document.createRange();
        caretRange.setStartAfter(App.autocomplete.dialog.focusNode);
        caretRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caretRange);

        // focus the editor
        App.autocomplete.dialog.editor.focus();
    }
};

App.autocomplete.dialog.dispatcher = function(res) {
    var dialog = App.autocomplete.dialog;
    var g = App;

    if(!res.data) {
        return;
    }

    // events that should only be caught in the top window
    if(!App.data.iframe) {

        if(res.data.action === 'g-dialog-populate') {
            dialog.childWindow = res.source;
            dialog.populate(res);
        }

    }

    if(res.data.action === 'g-dialog-completion') {
        var completionOptions = {};
        if(res.data.source === 'button') {
            completionOptions.source = 'button';
        }

        dialog.completion(completionOptions);
    }

    if(res.data.action === 'g-dialog-select-active') {
        dialog.selectActive(res.data);
    }

    if(res.data.action === 'g-dialog-restore-selection') {
        dialog.restoreSelection();
    }

};

App.autocomplete.dialog.init = function(doc) {
    // only create the dialog in the top window
    if(!App.data.iframe) {
        this.create();
    }

    window.addEventListener('message', this.dispatcher);
    this.bindKeyboardEvents(doc);
};

// remember the last active editor
$(document.body).on('focusin', function(e) {
    if(App.autocomplete.isEditable(e.target)) {
        if(!e.target.classList.contains('qt-dropdown-search')) {
            var dialog = App.autocomplete.dialog;
            dialog.editor = e.target;
        }
    }
});
