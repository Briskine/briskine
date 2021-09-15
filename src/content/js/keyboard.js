/**
 * Keyboard completion code.
 */

import autocomplete from './autocomplete';
import store from '../../store/store-client';

function getTemplateByShortcut (shortcut) {
  return store.getTemplate()
    .then((templates) => {
      const templateId = Object.keys(templates).find((id) => {
        return templates[id].shortcut === shortcut
      })

      let template
      if (templateId) {
        template = templates[templateId]
        store.updateTemplateStats(templateId)
      }

      return template
    })
}

export default {
    completion: function (e) {
        var element = e.target;
        var doc = element.ownerDocument;
        var selection = doc.getSelection();
        var focusNode = selection.focusNode;
        // if it's not an editable element
        // don't trigger anything
        if(!autocomplete.isEditable(element)) {
            return true;
        }

        // First get the cursor position
        autocomplete.cursorPosition = autocomplete.getCursorPosition(element);
        // Then get the word at the positon
        var word = autocomplete.getSelectedWord({
            element: element
        });
        autocomplete.cursorPosition.word = word;

        if (word.text) {
          getTemplateByShortcut(word.text).then((template) => {
            if (template) {
              autocomplete.replaceWith({
                  element: element,
                  quicktext: template,
                  focusNode: focusNode
              });
            }
          });
        }

    }
};
