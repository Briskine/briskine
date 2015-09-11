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
    isActive: false,
    isEmpty: true,
    RESULTS_LIMIT: 5, // only show 5 results at a time
    editor: null,
    qaBtn: null,
    dialogSelector: ".qt-dropdown",
    contentSelector: ".qt-dropdown-content",
    searchSelector: ".qt-dropdown-search",
    qaBtnSelector: '.gorgias-qa-btn',
    newTemplateSelector: ".g-new-template",
    qaPositionInterval: null,
    suggestedTemplates: [],
    suggestionHidden: false,

    completion: function (e, params) {
        if (typeof params !== 'object') {
            params = {};
        }

        params = params || {};

        if (e.preventDefault) {
            e.preventDefault();
        }

        if (e.stopPropagation) {
            e.stopPropagation();
        }

        var element = params.editor || e.target;
        params.element = element;

        // if it's not an editable element
        // don't trigger anything
        if (!App.autocomplete.isEditable(element)) {
            return false;
        }

        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(element);
        var word = App.autocomplete.getSelectedWord({
            element: element
        });

        App.autocomplete.cursorPosition.word = word;

        App.settings.getFiltered("", App.autocomplete.dialog.RESULTS_LIMIT, function (quicktexts) {
            App.autocomplete.quicktexts = quicktexts;

            params.quicktexts = App.autocomplete.quicktexts;

            App.autocomplete.dialog.populate(params);

            chrome.runtime.sendMessage({
                'request': 'track',
                'event': 'Showed dialog',
                'data': {
                    source: params.source ? params.source : "keyboard"
                }
            });
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
                App.autocomplete.dialog.selectActive();
                //App.autocomplete.dialog.close();
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

                App.autocomplete.quicktexts = quicktexts;
                App.autocomplete.dialog.populate({
                    quicktexts: App.autocomplete.quicktexts
                });
            });
        });

    },
    createQaBtn: function () {
        var container = $('body');

        var instance = this;

        // add the dialog quick access icon
        instance.qaBtn = $(instance.qaBtnTemplate);
        instance.qaTooltip = $(instance.qaBtnTooltip);

        container.append(instance.qaBtn);
        container.append(instance.qaTooltip);

        var showQaBtnTimer;

        // move the quick access button around
        // to the focused text field
        // the focus event doesn't support bubbling
        container.on('focusin', function (e) {

            if (showQaBtnTimer) {
                clearTimeout(showQaBtnTimer);
            }

            // add a small delay for showing the qa button.
            // in case the element's styles change its position on focus.
            // eg. gmail when you have multiple addresses configured,
            // and the from fields shows/hides on focus.
            showQaBtnTimer = setTimeout(function () {
                // Start fetching suggestions
                App.autocomplete.dialog.fetchSuggestions(e.target);

                instance.showQaBtn(e);
            }, 350);

        });

        container.on('focusout', function (e) {
            if (showQaBtnTimer) {
                clearTimeout(showQaBtnTimer);
            }
            instance.hideQaBtn(e);
        });

        instance.qaBtn.on('mouseup', function (e) {

            // position the dialog under the qa button.
            // since the focus node is now the button
            // we have to pass the previous focus (the text node).
            App.autocomplete.dialog.completion(e, {
                editor: App.autocomplete.dialog.editor,
                dialogPositionNode: e.target,
                source: 'button'
            });

            $('body').addClass('qa-btn-dropdown-show');
        });

        var showQaTooltip;
        // Show tooltip
        instance.qaBtn.on('mouseenter', function (e) {
            if (showQaTooltip) {
                clearTimeout(showQaTooltip);
            }
            showQaTooltip = setTimeout(function () {
                var padding = 22;
                var rect = instance.qaBtn[0].getBoundingClientRect();
                instance.qaTooltip.css({
                    top: rect.top - padding - parseInt(instance.qaTooltip.css('height'), 10) + "px",
                    left: rect.left + 45 - parseInt(instance.qaTooltip.css('width'), 10) + "px"
                });
                instance.qaTooltip.show();
            }, 500);

        });

        // Hide tooltip
        instance.qaBtn.on('mouseleave', function (e) {
            clearTimeout(showQaTooltip);
            instance.qaTooltip.hide();
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
                App.autocomplete.focusEditor(App.autocomplete.dialog.editor);

                // restore the previous caret position
                // since we didn't select any quicktext
                var selection = doc.getSelection();
                var caretRange = doc.createRange();
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
    populate: function (params) {
        params = params || {};

        App.autocomplete.quicktexts = params.quicktexts;

        if (App.autocomplete.dialog.suggestedTemplates.length && !App.autocomplete.dialog.suggestionHidden) {

            var found = false;
            for (var i in App.autocomplete.quicktexts) {
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
        if (App.autocomplete.cursorPosition && App.autocomplete.cursorPosition.word) {
            word_text = App.autocomplete.cursorPosition.word.text;
            text = word_text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }
        var searchRe = new RegExp(text, 'gi');

        var highlightMatch = function (match) {
            return '<span class="qt-search-highlight">' + match + '</span>';
        };

        var stripHtml = function (html) {
            var tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
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

        App.autocomplete.dialog.isActive = true;
        App.autocomplete.dialog.isEmpty = true;

        $(this.dialogSelector).addClass('qt-dropdown-show');

        $(App.autocomplete.dialog.contentSelector).scrollTop();

        App.autocomplete.dialog.setDialogPosition(params.dialogPositionNode);

        // focus the input focus after setting the position
        // because it messes with the window scroll focused
        $(App.autocomplete.dialog.searchSelector).focus();
    },
    setDialogPosition: function (positionNode) {
        if (!App.autocomplete.dialog.isActive) {
            return;
        }

        var paddingTop = 1;
        var dialogMaxHeight = 250;
        var pageHeight = window.innerHeight;
        var scrollTop = $(window).scrollTop();
        var scrollLeft = $(window).scrollLeft();

        $('body').removeClass('qt-dropdown-show-top');

        var $dialog = $(App.autocomplete.dialog.dialogSelector);

        var dialogMetrics = $dialog.get(0).getBoundingClientRect();

        var topPos = 0;
        var leftPos = 0;

        // in case we want to position the dialog next to
        // another element,
        // not next to the cursor.
        // eg. when we position it next to the qa button.

        var metrics;

        if (positionNode && positionNode.tagName) {

            metrics = positionNode.getBoundingClientRect();

            leftPos -= dialogMetrics.width;

            // because we use getBoundingClientRect
            // we need to add the scroll position
            topPos += scrollTop;
            leftPos += scrollLeft;

        } else {

            // cursorPosition doesn't need scrollTop/Left
            // because it uses the absolute page offset positions
            metrics = App.autocomplete.cursorPosition.absolute;

        }

        topPos += metrics.top + metrics.height;
        leftPos += metrics.left + metrics.width;

        topPos += paddingTop;

        // check if we have enough space at the bottom
        // for the maximum dialog height
        if ((pageHeight - (topPos - scrollTop)) < dialogMaxHeight) {

            topPos -= dialogMetrics.height;
            topPos -= metrics.height;

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
        }
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
    close: function (callback) {

        if (!App.autocomplete.dialog.isActive) {

            return;

            /*
             if(callback) {
             return callback();
             }
             */

        }

        $(this.dialogSelector).removeClass('qt-dropdown-show');
        $('body').removeClass('qt-dropdown-show-top');
        $('body').removeClass('qa-btn-dropdown-show');
        $(this.searchSelector).val('');

        App.autocomplete.dialog.isActive = false;
        App.autocomplete.dialog.isEmpty = null;

        App.autocomplete.dialog.quicktexts = [];
        App.autocomplete.dialog.cursorPosition = null;

    },
    showQaForElement: function (elem) {

        var show = false;

        // if the element is not a textarea
        // input[type=text] or contenteditable
        if ($(elem).is('textarea, input[type=text], [contenteditable]')) {
            show = true;
        }

        // if the quick access button is focused/clicked
        if (elem.className.indexOf('gorgias-qa-btn') !== -1) {
            show = false;
        }

        // if the dialog search field is focused
        if (elem.className.indexOf('qt-dropdown-search') !== -1) {
            show = false;
        }

        // check if the element is big enough
        // to only show the qa button for large textfields
        if (show === true) {

            var metrics = elem.getBoundingClientRect();

            // only show for elements
            if (metrics.width < 100 || metrics.height < 80) {
                show = false;
            }

        }

        return show;

    },
    showQaBtn: function (e) {

        // show the qabtn only on gmail and outlook
        if (App.activePlugin !== App.plugins['gmail'] && App.activePlugin !== App.plugins['outlook']) {
            return;
        }

        var dialog = this;
        var textfield = e.target;

        // only show it for valid elements
        if (!dialog.showQaForElement(textfield)) {
            return false;
        }

        Settings.get('settings', {}, function (settings) {
            if (settings.qaBtn && settings.qaBtn.enabled === false) {
                return;
            }

            $('body').addClass('gorgias-show-qa-btn');

            // TODO fix the qa-btn tooltip position
            // because it's not visible in an iframe

            // refresh the qaBtn reference, so we can check
            // if it stil exists. (outlook clears the entire body)
            dialog.qaBtn = $(dialog.qaBtnSelector);

            // in case the qa-btn doesn't exist, recreate it
            if(dialog.qaBtn.length < 1) {

                // if the body is contenteditable,
                // add an empty div, so we don't break
                // editability
                if(document.body.contentEditable === 'true') {
                    var blankDiv = document.createElement('div');
                    blankDiv.innerHTML = '&nbsp;';
                    document.body.appendChild(blankDiv);
                }

                if (settings.dialog.enabled) {
                    if (settings.qaBtn.enabled) {
                        // re-create the qa-btn
                        dialog.createQaBtn();
                    }

                    // re-create the dialog
                    dialog.create();

                }
            }

            var qaBtn = dialog.qaBtn.get(0);

            // padding from the top-right corner of the textfield
            var padding = 10;

            // Gmail is custom made
            if (window.location.origin === "https://mail.google.com") {
                var gmailHook = $(textfield).closest('td');
                if (gmailHook.length) {
                    $(qaBtn).css({
                        'top': padding + "px",
                        'right': padding + "px",
                        'left': 'initial'
                    });
                    qaBtn.remove();
                    gmailHook.append(qaBtn);

                    return;
                }
            }


            var setPosition = function () {
                var metrics = textfield.getBoundingClientRect();

                var top = metrics.top;
                var left = metrics.left;

                top += $(window).scrollTop();
                left += $(window).scrollLeft();

                top += padding;
                left -= padding;

                // move the quick access button to the right
                // of the textfield
                left += textfield.offsetWidth - qaBtn.offsetWidth;

                // move the btn using transforms
                // for performance
                var transform = 'translate3d(' + left + 'px, ' + top + 'px, 0)';

                qaBtn.style.transform = transform;
                qaBtn.style.msTransform = transform;
                qaBtn.style.mozTransform = transform;
                qaBtn.style.webkitTransform = transform;

                if (textfield.style.zIndex) {
                    qaBtn.style.zIndex = textfield.style.zIndex + 1;
                } else {
                    qaBtn.style.zIndex = 1;
                }
            };
            setPosition();

            // re-calculate the qa-btn position at an interval,
            // in case it's position or size changes
            dialog.qaPositionInterval = setInterval(setPosition, 1000);
        });
    },
    hideQaBtn: function () {
        $('body').removeClass('gorgias-show-qa-btn');

        // stop the position recalculation interval, on focusout
        if(this.qaPositionInterval) {
            clearInterval(this.qaPositionInterval);
        }
    }
};

// fetch template content from the extension
var contentUrl = chrome.extension.getURL("pages/content.html");
$.get(contentUrl, function (data) {
    var vars = [
        'App.autocomplete.dialog.qaBtnTemplate',
        'App.autocomplete.dialog.qaBtnTooltip',
        'App.autocomplete.dialog.template',
        'App.autocomplete.dialog.liTemplate'
    ];

    for (var i in vars) {
        var v = vars[i];
        var start = data.indexOf(v);
        var end = data.lastIndexOf(v);
        // todo(@xarg): sorry the barbarian splitting, could have been done much better.
        App.autocomplete.dialog[v.split('.').slice(-1)] = data.slice(start + v.length + 3, end - 4);
    }
}, "html");

/* focus management. rememeber the last active editor and
* node in the editor.
* TODO should probably be moved inside an init function.
*/
$(document.body).on('focus keyup mouseup', function(e) {

    if(App.autocomplete.isEditable(e.target)) {

        if(!e.target.classList.contains('qt-dropdown-search')) {
            var dialog = App.autocomplete.dialog;
            dialog.editor = e.target;

            var doc = e.target.ownerDocument;
            var selection = doc.getSelection();
            dialog.focusNode = selection.focusNode;
        }

    }

});
