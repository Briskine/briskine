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

  // cache selection details
  const selection = window.getSelection()
  const focusNode = selection.focusNode
  const focusOffset = selection.focusOffset
  const anchorNode = selection.anchorNode
  const anchorOffset = selection.anchorOffset

  const word = getSelectedWord({
    element: element
  })

  if (word.text) {
    getTemplateByShortcut(word.text).then((template) => {
      if (template) {
        // TODO restore selection
        element.focus()
        if (
          isContentEditable(element) &&
          anchorNode &&
          focusNode
        ) {
          window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
        }

        // TODO stop sending and using params.focusNode in plugins
        // TODO stop focusing in plugins
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
