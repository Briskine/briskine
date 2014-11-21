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
                    App.autocomplete.keyboard.focusNext(e);
                }
            });
        } else {
            // No text, focus next
            App.autocomplete.keyboard.focusNext(e);
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
        if (App.data.contentEditable) {

            // TODO maybe just use [tabindex=1]
            // so we're not Gmail specific.
            // If it does not work
            // we probably have to add a method to the plugin.

            button = $(e.target).closest('table').parent().closest('table').find('[role=button][tabindex="1"]').first();

        } else {

            var elements = $(e.target).closest('table').find('input,textarea,button');
            button = elements.eq(elements.index(element) + 1);

        }

        if (button.length) {
            button.focus();
        }
    }
};
