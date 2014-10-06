/**
 * Keyboard completion code.
 */

App.autocomplete.keyboard = {
    completion: function (e) {
        // only works in compose area
        if (!App.data.inCompose) {
            return true;
        }
        e.preventDefault();
        e.stopPropagation();

        // First get the cursor position
        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(e);
        // Then get the word at the positon
        var word = App.autocomplete.getSelectedWord(App.autocomplete.cursorPosition);
        App.autocomplete.cursorPosition.word = word;

        if (word.text) {
            // Find a matching Quicktext shortcut in the bg script
            App.settings.getQuicktextsShortcut(word.text, function (quicktexts) {
                if (quicktexts.length) {
                    // replace with the first quicktext found
                    App.autocomplete.replaceWith(quicktexts[0], e);
                } else { // no quicktext found.. focus the next element
                    App.autocomplete.focusNext(e);
                }
            });
        } else {
            // No text, focus next
            App.autocomplete.focusNext(e);
        }
    },
    /*
     Moves focus from editable content to Send button
     */
    focusNext: function (e) {
        // focus next, but only if the keyboard shortcut used is a TAB
        if (e.keyCode !== KEY_TAB) {
            return;
        }

        var button;
        if (App.data.gmailView == 'basic html') {
            var elements = $(e.target).closest('table').find('input,textarea,button');
            button = elements.eq(elements.index(element) + 1);
        } else if (App.data.gmailView === 'standard') {
            button = $(e.target).closest('table').parent().closest('table').find('[role=button][tabindex="1"]').first();
        }

        if (button.length) {
            button.focus();
        }
    }
};
