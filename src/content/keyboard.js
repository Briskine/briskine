/**
 * Keyboard completion code.
 */

import autocomplete from './autocomplete.js';
import store from '../store/store-client.js';

function getTemplateByShortcut (shortcut) {
  return store.getTemplates()
    .then((templates) => {
      const template = templates.find((t) => {
        return t.shortcut === shortcut
      })

      if (template) {
        store.updateTemplateStats(template.id)
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

        var word = autocomplete.getSelectedWord({
          element: element
        })

        if (word.text) {
          getTemplateByShortcut(word.text).then((template) => {
            if (template) {
              autocomplete.replaceWith({
                  element: element,
                  quicktext: template,
                  focusNode: focusNode,
                  word: word,
              });
            }
          });
        }

    }
};
