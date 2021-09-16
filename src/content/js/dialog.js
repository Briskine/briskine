/* globals REGISTER_DISABLED */
/**
 * Autocomplete dialog code.
 */

import browser from 'webextension-polyfill';
import $ from 'jquery';
import Handlebars from 'handlebars';
import Mousetrap from 'mousetrap';

import PubSub from './patterns';
import store from '../../store/store-client';
import autocomplete from './autocomplete';
import enableDialogSearchAttr from './dialog-search-attr';
import fuzzySearch from './search';

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

function getFilteredTemplates (text, limit) {
  let settings = {}
  return store.getSettings()
    .then((res) => {
      settings = res
      return store.getTemplate()
    })
    .then((res) => {
      let templates = Object.keys(res).map((id) => res[id]);
      if (text) {
        templates = fuzzySearch(templates, text);
      } else {
        // sort templates only if no search was used

        // sort by created_datetime desc
        templates.sort(function(a, b) {
          return (
            new Date(b.created_datetime) -
            new Date(a.created_datetime)
          );
        });

        // then sort by updated_datetime so the last one updated is first
        templates.sort(function(a, b) {
          return (
            new Date(b.updated_datetime) -
            new Date(a.updated_datetime)
          );
        });

        if (settings.dialog_sort) {
          // Sort the filtered template alphabetically
          templates.sort(function(a, b) {
            return a.title.localeCompare(b.title);
          });
        } else {
          // sort by lastuse_datetime desc
          templates.sort(function(a, b) {
            if (!a.lastuse_datetime) {
              a.lastuse_datetime = new Date(0);
            }

            if (!b.lastuse_datetime) {
              b.lastuse_datetime = new Date(0);
            }
            return (
              new Date(b.lastuse_datetime) -
              new Date(a.lastuse_datetime)
            );
          });
        }

        // Apply template limit
        if (limit && limit < templates.length) {
          templates = templates.slice(0, limit);
        }
      }

      return templates;
    });
}

var dialog = {
    isActive: false,
    isEmpty: true,
    RESULTS_LIMIT: 5, // only show 5 results at a time
    editor: null,
    prevFocus: null,
    dialogSelector: ".qt-dropdown",
    contentSelector: ".qt-dropdown-content",
    searchSelector: ".qt-dropdown-search",
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
        return getFilteredTemplates('', dialog.RESULTS_LIMIT)
          .then((quicktexts) => {
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

        let searchDebouncer = null
        $dialog.on('input', this.searchSelector, function (e) {
          // ignore modifier keys because they manipulate
          if ([KEY_ENTER, KEY_UP, KEY_DOWN].includes(e.keyCode)) {
            return
          }

          autocomplete.cursorPosition.word.text = $(this).val()

          if (searchDebouncer) {
            clearTimeout(searchDebouncer)
          }

          searchDebouncer = setTimeout(() => {
            getFilteredTemplates(autocomplete.cursorPosition.word.text, dialog.RESULTS_LIMIT).then((quicktexts) => {
              // don't update if dialog was closed before getting new templates
              if (!dialog.isActive) {
                return
              }

              autocomplete.quicktexts = quicktexts;
              dialog.populate({
                quicktexts: autocomplete.quicktexts
              })
            })
          }, 100)
        })

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
            // browserAction.openPopup is not supported in all browsers yet.
            // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/openPopup
            // Open the browserAction popup in a new tab.
            const popupUrl = browser.runtime.getURL('popup/popup.html');
            window.open(`${popupUrl}?source=tab`, Config.dashboardTarget);
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

            store.updateTemplateStats(quicktext.id)
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
        $(this.searchSelector).val('');

        dialog.isActive = false;
        dialog.isEmpty = null;

        dialog.quicktexts = [];
        dialog.cursorPosition = null;

    }
};

// dialog html templates
dialog.template = `
<div class="qt-dropdown ${REGISTER_DISABLED ? 'briskine-register-disabled' : ''}">
    <div class="qt-info">
        Please
        <a href="#" class="js-gorgias-signin">
            Sign in
        </a>
        ${!REGISTER_DISABLED ? `
            or
            <a href="{{signupUrl}}" target="_blank">
                Create a free account
            </a>
        ` : 'to access your templates.'}
    </div>

    <input type="search" class="qt-dropdown-search" value="" placeholder="Search templates...">
    <ul class="qt-dropdown-content">

    </ul>
    <div class="g-dropdown-toolbar">
        <button class="g-new-template">New Template</button>
    </div>
</div>
`;

dialog.liTemplate = `
{{#if elements.length}}
{{#each elements}}
<li class="qt-item" data-id="{{id}}"
title="Title: {{{originalTitle}}}{{#if this.tags }}
Tags: {{{this.tags}}}{{/if}}

{{originalBody}}">
<span class="qt-title">{{{title}}}</span>
{{#if this.shortcut}}
<span class="qt-shortcut">{{{this.shortcut}}}</span>
{{/if}}
<span class="qt-body">{{{body}}}</span>
<button type="button" class="qt-edit" title="Edit template"></button>
</li>
{{/each}}
{{else}}
<li class="qt-blank-state">No templates found.</li>
{{/if}}
`;

enableDialogSearchAttr();

export default dialog;
