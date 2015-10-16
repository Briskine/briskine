/**
 * Keyboard completion code.
 */

App.autocomplete.keyboard = {
    completion: function (e) {

        // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events

        var element = e.target;
        var doc = element.ownerDocument;
        var selection = doc.getSelection();
        var focusNode = selection.focusNode;


        var getNextElement = function(event) {
            var nextElement = document.activeElement;
            element.focus();

            element.addEventListener('no-template', function(){
                nextElement.focus();
            });
        };

        // if it's not an editable element
        // don't trigger anything
        if(!App.autocomplete.isEditable(element)) {
            return true;
        }

        element.addEventListener('blur', getNextElement);

        if(selection.rangeCount) {
            var range = selection.getRangeAt(0);
            var caretPos = range.endOffset;
        }

        // First get the cursor position
        App.autocomplete.cursorPosition = App.autocomplete.getCursorPosition(element);
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
                        focusNode: focusNode
                    });
                } else {
                    element.trigger('no-template');
                }
            });

        } else {
            element.trigger('no-template');
        }

    }
};
