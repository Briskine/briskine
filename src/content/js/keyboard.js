/**
 * Keyboard completion code.
 */

App.autocomplete.keyboard = {
    completion: function (e) {

        var selection = window.getSelection();
        var element = e.target;

        // First get the cursor position
        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(e);
        // Then get the word at the positon
        var word = App.autocomplete.getSelectedWord({
            element: element
        });
        App.autocomplete.cursorPosition.word = word;

        if (word.text) {

            // Find a matching Quicktext shortcut in the bg script
            App.settings.getQuicktextsShortcut(word.text, function (quicktexts) {

                if (quicktexts.length) {
                    // replace with the first quicktext found
                    App.autocomplete.replaceWith({
                        element: element,
                        quicktext: quicktexts[0],
                        selection: selection
                    });
                }

            });

        }

    }
};
