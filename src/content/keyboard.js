/**
 * Keyboard Shortcut Autocomplete
 */
import autocomplete from './autocomplete.js'
import getEventTarget from './utils/event-target.js'
import { getSelectionRange, setSelectionRange } from './utils/selection.js'
import { getWord } from './utils/word.js'
import { isContentEditable } from './editors/editor-contenteditable.js'
import { isTextfieldEditor } from './editors/editor-textfield.js'
import {getTemplates} from '../store/store-content.js'

import {keybind, keyunbind} from './keybind.js'
import {swipebind, swipeunbind} from './swipe.js'

async function getTemplateByShortcut (shortcut) {
  const templates = await getTemplates()
  return templates.find((t) => {
    return t.shortcut === shortcut
  })
}

async function keyboardAutocomplete (e) {
  let element = getEventTarget(e)

  // if it's not an editable element
  // don't trigger anything
  if (!isTextfieldEditor(element) && !isContentEditable(element)) {
    return
  }

  const word = getWord(element)
  if (!word.text) {
    return
  }

  // cache range
  const cachedRange = getSelectionRange(element)

  const template = await getTemplateByShortcut(word.text)
  if (!template) {
    return
  }

  // prevent default when getTemplateByShortcut returns immediately
  e.preventDefault()
  e.stopImmediatePropagation()

  // restore selection
  element.focus({ preventScroll: true })
  if (
    isContentEditable(element)
    && cachedRange
  ) {
    await setSelectionRange(element, cachedRange)
  }

  autocomplete({
    element: element,
    template: template,
  })
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
