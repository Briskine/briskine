/**
 * Keyboard Shortcut Autocomplete
 */
import {autocomplete, getSelectedWord} from './autocomplete.js'
import {isContentEditable} from './editors/editor-contenteditable.js'
import store from '../store/store-client.js'

import {keybind, keyunbind} from './keybind.js'

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

let skipKeyboardEvent = false

function keyboardAutocomplete (e) {
  // if we're in the replay phase,
  // skip our handler
  if (skipKeyboardEvent === true) {
    skipKeyboardEvent = false
    return
  }

  const element = e.target
  // if it's not an editable element
  // don't trigger anything
  if (!isTextfield(element) && !isContentEditable(element)) {
    return
  }

  const word = getSelectedWord({
    element: element
  })

  if (word.text) {
    // cache selection details
    const selection = window.getSelection()
    const focusNode = selection.focusNode
    const focusOffset = selection.focusOffset
    const anchorNode = selection.anchorNode
    const anchorOffset = selection.anchorOffset

    // stop event by default,
    // we'll replay it later if it doesn't match any template.
    e.preventDefault()
    e.stopImmediatePropagation()

    getTemplateByShortcut(word.text)
      .then((template) => {
        if (template) {
          // restore selection
          element.focus()
          if (
            isContentEditable(element) &&
            anchorNode &&
            focusNode
          ) {
            window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
          }

          return autocomplete({
              element: element,
              quicktext: template,
              word: word,
          })
        }

        // template with specific shortcut not found,
        // replay the original event.
        skipKeyboardEvent = true
        element.dispatchEvent(e)
      })
      .catch((err) => {
        // replay the original event,
        // if there was an error getting the templates.
        skipKeyboardEvent = true
        element.dispatchEvent(e)

        throw err
      })
  }
}

let cachedKeyboardShortcut = ''

export function setup (settings = {}) {
  cachedKeyboardShortcut = settings.expand_shortcut
  // use custom keyboard shortcuts
  if (settings.expand_enabled) {
    keybind(
      cachedKeyboardShortcut,
      keyboardAutocomplete,
    )
  }
}

export function destroy () {
  keyunbind(cachedKeyboardShortcut, keyboardAutocomplete)
}
