/**
 * Autocomplete dialog code.
 */

import browser from 'webextension-polyfill';
import $ from 'jquery';
import Handlebars from 'handlebars';
import _ from 'underscore';
import Mousetrap from 'mousetrap';

import PubSub from './patterns';
import store from '../../store/store-client';
import autocomplete from './autocomplete';
import {isQuickButtonEnabled} from './utils';
import enableDialogSearchAttr from './dialog-search-attr';

import Config from '../../config';

var KEY_UP = 38;
var KEY_DOWN = 40;
var KEY_ENTER = 13;

PubSub.subscribe('focus', function (action, element) {
    if (action === 'off') {
        if (element === null) {
            dialog.close();
        } else if ($(element).attr('class') !== $(dialog.searchSelector).attr('class')) {
            dialog.close();
        }
    }
});

var dialog = {
    isActive: false,
    isEmpty: true,
    RESULTS_LIMIT: 5, // only show 5 results at a time
    editor: null,
    qaBtn: null,
    prevFocus: null,
    dialogSelector: ".qt-dropdown",
    contentSelector: ".qt-dropdown-content",
    searchSelector: ".qt-dropdown-search",
    qaBtnSelector: '.gorgias-qa-btn',
    newTemplateSelector: ".g-new-template",

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

        var element = params.focusNode || e.target;
        params.element = element;

        // if it's not an editable element
        // don't trigger anything
        if (!autocomplete.isEditable(element)) {
            return false;
        }

        autocomplete.cursorPosition = autocomplete.getCursorPosition(element);
        autocomplete.cursorPosition.word = autocomplete.getSelectedWord({
            element: element
        });

        // fetch templates from storage to populate the dialog
        window.App.settings.getFiltered("", dialog.RESULTS_LIMIT, function (quicktexts) {
            autocomplete.quicktexts = quicktexts;

            params.quicktexts = autocomplete.quicktexts;

            dialog.populate(params);

            browser.runtime.sendMessage({
                'request': 'track',
                'event': 'Showed dialog',
                'data': {
                    source: params.source ? params.source : "keyboard"
                }
            });
        });

    },
    create: function () {
        // create only once in the root of the document.
        // render outside body,
        // to avoid issues with body content being completely replaced.
        var container = $(document.documentElement);

        // login and signup links
        const signupUrl = `${Config.websiteUrl}/signup`;
        const parsedDialogTemplate = Handlebars.compile(this.template)({
            signupUrl: signupUrl
        });

        // Add loading dropdown
        var $dialog = $(parsedDialogTemplate);
        container.append($dialog);

        //Gmail HACK: set z-index to auto to a parent, otherwise the autocomplete
        //      dropdown will not be displayed with the correct stacking
        $dialog.parents('.qz').css('z-index', 'auto');

        // Handle mouse hover and click
        $dialog.on('mouseover mousedown', '.qt-item', function (e) {
            e.preventDefault();
            e.stopPropagation();

            dialog.selectItem($(this).index('.qt-item'));
            if (e.type === 'mousedown') {
                dialog.selectActive();
                //dialog.close();
            }
        });

        $(dialog.newTemplateSelector).on('mousedown', function () {
            browser.runtime.sendMessage({'request': 'new'});
        });

        $dialog.on('keyup', this.searchSelector, function (e) {
            // ignore modifier keys because they manipulate
            if (_.contains([KEY_ENTER, KEY_UP, KEY_DOWN], e.keyCode)) {
                return;
            }

            autocomplete.cursorPosition.word.text = $(this).val();

            window.App.settings.getFiltered(autocomplete.cursorPosition.word.text, dialog.RESULTS_LIMIT, function (quicktexts) {
                // don't update if dialog was closed before getting new templates
                if (!dialog.isActive) {
                    return;
                }

                autocomplete.quicktexts = quicktexts;
                dialog.populate({
                    quicktexts: autocomplete.quicktexts
                });
            });
        });

        // edit template from dialog
        $dialog.on('mousedown', '.qt-edit', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var templateId = $(e.target).closest('.qt-item').data('id');
            var templateUrl = `${Config.functionsUrl}/#/list?id=${templateId}`;
            window.open(templateUrl, Config.dashboardTarget);
        });

        // prevent closing the dialog when clicking the info box
        $dialog.on('mousedown', '.qt-info', function (e) {
            e.preventDefault();
        });

        $dialog.on('mousedown', '.js-gorgias-signin', function () {
            // HACK
            // we can't re-render the dialog on session success,
            // because we lost the pointer to the editor element.
            // we provide immediate feedback by closing the dialog.
            // BUG requires pressing the sign-in button twice.
            dialog.close();

            // check session
            store.getSession()
                .catch(() => {
                    // logged-out
                    window.open(Config.functionsUrl, Config.dashboardTarget);
                });
        });
    },
    setupQuickButton: function () {
        if (isQuickButtonEnabled()) {
            return dialog.createQaBtn();
        }

        const domObserver = new MutationObserver((records, observer) => {
            if (isQuickButtonEnabled()) {
                observer.disconnect();

                dialog.createQaBtn();
            }
        });
        domObserver.observe(document.body, {
            attributes: true
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

            // return the focus to the element focused
            // before clicking the qa button
            dialog.prevFocus.focus();

            // position the dialog under the qa button.
            // since the focus node is now the button
            // we have to pass the previous focus (the text node).
            dialog.completion(e, {
                focusNode: dialog.prevFocus,
                dialogPositionNode: e.target,
                source: 'button'
            });

            $('body').addClass('qa-btn-dropdown-show');
        });

        var showQaTooltip;
        // Show tooltip
        instance.qaBtn.on('mouseenter', function () {
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
        instance.qaBtn.on('mouseleave', function () {
            clearTimeout(showQaTooltip);
            instance.qaTooltip.hide();
        });


    },
    bindKeyboardEvents: function (doc) {
        Mousetrap.bindGlobal('up', function () {
            if (dialog.isActive) {
                dialog.changeSelection('prev');
            }
        });
        Mousetrap.bindGlobal('down', function () {
            if (dialog.isActive) {
                dialog.changeSelection('next');
            }
        });
        Mousetrap.bindGlobal('escape', function (e) {
            if (dialog.isActive) {
                // prevent focus moving to To field in Gmail
                e.stopPropagation();

                dialog.close();
                dialog.editor.focus();
                // restore the previous caret position
                // since we didn't select any quicktext
                var selection = doc.getSelection();
                var caretRange = doc.createRange();
                caretRange.setStartAfter(dialog.focusNode);
                caretRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(caretRange);
            }
        });
        Mousetrap.bindGlobal('enter', function () {
            if (dialog.isActive) {
                dialog.selectActive();
                dialog.close();
            }
        });

    },
    populate: function (params) {
        params = params || {};

        autocomplete.quicktexts = params.quicktexts;

        // clone the elements
        // so we can safely highlight the matched text
        // without breaking the generated handlebars markup
        var clonedElements = $.extend(true, [], autocomplete.quicktexts);

        // highlight found string in element title, body and shortcut
        var word_text = '';
        var text = '';
        if (autocomplete.cursorPosition && autocomplete.cursorPosition.word) {
            word_text = autocomplete.cursorPosition.word.text;
            text = word_text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }
        var searchRe = new RegExp(text, 'gi');

        var highlightMatch = function (match) {
            return '<span class="qt-search-highlight">' + match + '</span>';
        };

        var stripHtml = function (html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || '';
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

        var content = Handlebars.compile(dialog.liTemplate)({
            elements: clonedElements
        });

        $(this.contentSelector).html(content);

        if (!dialog.isActive) {
            dialog.show(params);
        }

        dialog.isEmpty = false;

        // Set first element active
        dialog.selectItem(0);

    },
    show: function (params) {
        params = params || {};

        // get current focused element - the editor
        var doc = params.element.ownerDocument;
        dialog.editor = doc.activeElement;

        var selection = doc.getSelection();
        var focusNode = selection.focusNode;
        dialog.focusNode = focusNode;

        dialog.isActive = true;
        dialog.isEmpty = true;

        $(this.dialogSelector).addClass('qt-dropdown-show');

        $(dialog.contentSelector).scrollTop();

        dialog.setDialogPosition(params.dialogPositionNode);

        // focus the input focus after setting the position
        // because it messes with the window scroll focused
        $(dialog.searchSelector).focus();

        // show or hide the login hint
        const loggedOutClassName = 'qt-logged-out';
        const dialogElement = document.querySelector(this.dialogSelector);
        store.getLoginInfo()
            .then(() => {
                dialogElement.classList.remove(loggedOutClassName);
            })
            .catch(() => {
                dialogElement.classList.add(loggedOutClassName);
            });
    },
    setDialogPosition: function (positionNode) {
        if (!dialog.isActive) {
            return;
        }

        var paddingTop = 1;
        var dialogMaxHeight = 250;
        var pageHeight = window.innerHeight;
        var scrollTop = $(window).scrollTop();
        var scrollLeft = $(window).scrollLeft();

        var $dialog = $(dialog.dialogSelector);

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
            metrics = autocomplete.cursorPosition.absolute;

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
        }

        $dialog.css({
            top: topPos,
            left: leftPos
        });

    },
    selectItem: function (index) {
        if (dialog.isActive && !dialog.isEmpty) {
            var content = $(this.contentSelector);
            var $element = content.children('.qt-item').eq(index);

            content.children('.qt-item').removeClass('active');

            $element.addClass('active');
        }
    },
    selectActive: function () {
        if (dialog.isActive && !this.isEmpty && autocomplete.quicktexts.length) {
            const activeItemId = document.querySelector(this.contentSelector).querySelector('.active').dataset.id;
            var quicktext = autocomplete.quicktexts.find(function (quicktext) {
                return quicktext.id === activeItemId;
            });

            autocomplete.replaceWith({
                element: dialog.editor,
                quicktext: quicktext,
                focusNode: dialog.focusNode
            });

            dialog.close();

            browser.runtime.sendMessage({
                'request': 'track',
                'event': 'Inserted template',
                'data': {
                    "id": quicktext.id,
                    "source": "dialog",
                    "title_size": quicktext.title.length,
                    "body_size": quicktext.body.length
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

        dialog.selectItem(index_new);

        // scroll the active element into view
        var $element = content.children('.qt-item').eq(index_new);
        $element.get(0).scrollIntoView();
    },
    // remove dropdown and cleanup
    close: function () {
        if (!dialog.isActive) {
            return;
        }

        $(this.dialogSelector).removeClass('qt-dropdown-show');
        $('body').removeClass('qa-btn-dropdown-show');
        $(this.searchSelector).val('');

        dialog.isActive = false;
        dialog.isEmpty = null;

        dialog.quicktexts = [];
        dialog.cursorPosition = null;

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
            if (metrics.width < 100 || metrics.height < 30) {
                show = false;
            }
        }

        return show;

    },
    showQaBtn: function (e) {

        var textfield = e.target;

        // only show it for valid elements
        if (!dialog.showQaForElement(textfield)) {
            return false;
        }

        store.getSettings({
            key: 'settings'
        }).then((settings) => {
            if (settings.qaBtn && settings.qaBtn.enabled === false) {
                return;
            }

            $('body').addClass('gorgias-show-qa-btn');

            dialog.prevFocus = textfield;

            var qaBtn = dialog.qaBtn.get(0);

            // padding from the top-right corner of the textfield
            var padding = 10;

            // positioning the quick-action button.
            // Gmail is custom made
            // TODO use the general positioning method for Gmail
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

                    // First time a user uses our extension, we show it and then hide it
                    if (settings.qaBtn && settings.qaBtn.hasOwnProperty('shownPostInstall')) {
                        if (!settings.qaBtn.shownPostInstall) {
                            $(qaBtn).trigger('mouseup');
                            settings.qaBtn.shownPostInstall = true;
                            store.setSettings({
                                key: 'settings',
                                val: settings
                            });
                        }
                    }
                    return;
                }
            } else {
                activeTextfield = textfield;
                setQaBtnPosition();
                window.addEventListener('scroll', setQaBtnPosition, true);
            }

        });
    },
    hideQaBtn: function () {
        activeTextfield = null;
        window.removeEventListener('scroll', setQaBtnPosition, true);
        document.body.classList.remove('gorgias-show-qa-btn');
    }
};

let activeTextfield = null;

function setQaBtnPosition () {
    if (!activeTextfield) {
        return;
    }
    var qaBtn = dialog.qaBtn.get(0);
    // padding from the top-right corner of the textfield
    const padding = 5;

    window.requestAnimationFrame(() => {
        const textfieldRect = activeTextfield.getBoundingClientRect();
        // top-right corner of the textfield
        const top = textfieldRect.top + window.scrollY + padding;
        const left = textfieldRect.right - window.scrollX - qaBtn.offsetWidth - padding * 2;

        qaBtn.style.top = `${top}px`;
        qaBtn.style.left = `${left}px`;
    });
}

// fetch template content from the extension
var contentUrl = browser.runtime.getURL("pages/content.html");
$.get(contentUrl, function (data) {
    var vars = [
        'dialog.qaBtnTemplate',
        'dialog.qaBtnTooltip',
        'dialog.template',
        'dialog.liTemplate'
    ];

    for (var i in vars) {
        var v = vars[i];
        var start = data.indexOf(v);
        var end = data.lastIndexOf(v);
        // todo(@xarg): sorry the barbarian splitting, could have been done much better.
        dialog[v.split('.').slice(-1)] = data.slice(start + v.length + 3, end - 4);
    }
}, "html");

enableDialogSearchAttr();

export default dialog;
