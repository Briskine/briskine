/**
 * Keyboard completion code.
 */

App.autocomplete.keyboard = {
    completion: function (e) {

        var element = e.target;
        var doc = element.ownerDocument;
        var selection = doc.getSelection();
        var focusNode = selection.focusNode;

        // if it's not an editable element
        // don't trigger anything
        if(!App.autocomplete.isEditable(element)) {
            return true;
        }

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

            var notemplateEvent = new CustomEvent('notemplate');
            var getNextElement = function(event) {
                console.log('foo');
                var nextElement = document.activeElement;
                element.focus();

                var returnToElement = function() {
                    console.log('bar');
                    nextElement.focus();
                    element.removeEventListener('notemplate', returnToElement);
                };

                element.addEventListener('notemplate', returnToElement);
            };

            element.addEventListener('blur', getNextElement);

            // Find a matching Quicktext shortcut in the bg script
            App.settings.getQuicktextsShortcut(word.text, function (quicktext) {

                if (quicktext) {
                    // replace with the first quicktext found
                    App.autocomplete.replaceWith({
                        element: element,
                        quicktext: quicktext,
                        focusNode: focusNode
                    });
                } else {
                    element.removeEventListener('blur', getNextElement);
                    element.dispatchEvent(notemplateEvent);
                }
            });

        }
    }
};
