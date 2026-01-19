/**
 * Keyboard Shortcut Autocomplete
 */
import autocomplete from './autocomplete.js'
import getEventTarget from './event-target.js'
import getComposedSelection from './selection.js'
import getWord from './word.js'
import {isContentEditable} from './editors/editor-contenteditable.js'
import {getTemplates} from '../store/store-content.js'

import {keybind, keyunbind} from './keybind.js'
import {swipebind, swipeunbind} from './swipe.js'

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

function getTemplateByShortcut (shortcut) {
  return getTemplates()
    .then((templates) => {
      return templates.find((t) => {
        return t.shortcut === shortcut
      })
    })
}

async function keyboardAutocomplete (e) {
  let element = getEventTarget(e)

  // if it's not an editable element
  // don't trigger anything
  if (!isTextfield(element) && !isContentEditable(element)) {
    return
  }

  const word = getWord(element)


  if (word.text) {
    // cache selection details
    const selection = getComposedSelection(element)
    const focusNode = selection.focusNode
    const focusOffset = selection.focusOffset
    const anchorNode = selection.anchorNode
    const anchorOffset = selection.anchorOffset

    const template = await getTemplateByShortcut(word.text)
    if (template) {
      // prevent default when getTemplateByShortcut returns immediately
      e.preventDefault()
      e.stopImmediatePropagation()

      // restore selection
      element.focus()
      if (anchorNode && focusNode) {
        getComposedSelection(element).setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
      }

      autocomplete({
        element: element,
        template: template,
        word: word,
      })
    }
  }
}

let cachedKeyboardShortcut = ''

export function setup (settings = {}) {
  cachedKeyboardShortcut = settings.expand_shortcut
  if (settings.expand_enabled) {
    keybind(cachedKeyboardShortcut, keyboardAutocomplete)
    swipebind(keyboardAutocomplete)
  }
}

export function destroy () {
  keyunbind(cachedKeyboardShortcut, keyboardAutocomplete)
  swipeunbind()
}
