/**
 * Keyboard Shortcut Autocomplete
 */
import {autocomplete, getSelectedWord} from './autocomplete.js'
import {isContentEditable} from './editors/editor-contenteditable.js'
import store from '../store/store-client.js'

import {keybind, keyunbind} from './keybind.js'

let shortcutCache = []
function updateShortcutCache (templates = []) {
  shortcutCache = templates.map((t) => t.shortcut).filter((shortcut) => shortcut)
}

store.on('templates-updated', updateShortcutCache)

function getTemplateByShortcut (shortcut) {
  return store.getTemplates()
    .then((templates) => {
      updateShortcutCache(templates)

      return templates.find((t) => {
        return t.shortcut === shortcut
      })
    })
}

function keyboardAutocomplete (e) {
  const element = e.target

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
    if (shortcutCache.includes(word.text)) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    getTemplateByShortcut(word.text).then((template) => {
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

        autocomplete({
            element: element,
            quicktext: template,
            word: word,
        })
      }
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
