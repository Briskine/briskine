/**
 * Keyboard completion code.
 */

import {autocomplete, getSelectedWord} from './autocomplete.js'
import {isContentEditable} from './editors/editor-contenteditable.js'
import store from '../store/store-client.js'

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

function getTemplateByShortcut (shortcut) {
  return store.getTemplates()
    .then((templates) => {
      return templates.find((t) => {
        return t.shortcut === shortcut
      })
    })
}

export function keyboardAutocomplete (e) {
  const element = e.target
  // if it's not an editable element
  // don't trigger anything
  if (!isTextfield(element) && !isContentEditable(element)) {
    return
  }

  var selection = window.getSelection()
  var focusNode = selection.focusNode

  var word = getSelectedWord({
    element: element
  })

  if (word.text) {
    getTemplateByShortcut(word.text).then((template) => {
      if (template) {
        autocomplete({
            element: element,
            quicktext: template,
            focusNode: focusNode,
            word: word,
        });
      }
    });
  }
}
