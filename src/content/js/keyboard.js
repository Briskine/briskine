/**
 * Keyboard completion code.
 */

App.autocomplete.keyboard = {
    completion: function (e) {

        var element = e.target;

        //console.log(settings.keyboard.shortcut);
        if ((window.location.hostname === 'mail.google.com') &&
            (element.getAttribute('aria-label') === 'Message Body') &&
            (event.keyCode === 9)) {

            e.preventDefault();
            e.stopPropagation();

            var focusNextElement = function() {
                var tabbableElements = document.querySelectorAll('[tabindex="1"], [tabindex="0"]');
                var nextElement = null;

                for (var tabbableElementIdx in tabbableElements) {
                    var tabbableElement = tabbableElements[tabbableElementIdx];
                    if (tabbableElement === element) {
                        nextElement = tabbableElements[parseInt(tabbableElementIdx) + 1];
                        break;
                    }
                }

                if (nextElement) {
                    nextElement.focus();
                }
            }
        }

        var doc = element.ownerDocument;
        var selection = doc.getSelection();
        var focusNode = selection.focusNode;
        // if it's not an editable element
        // don't trigger anything
        if(!App.autocomplete.isEditable(element)) {
            if (focusNextElement) {
                focusNextElement();
            }
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
                    if (focusNextElement) {
                        focusNextElement();
                    }
                }
            });

        } else {
            if (focusNextElement) {
                focusNextElement();
            }
        }
    }
};
