/**
 * Keyboard Shortcut Autocomplete
 */
import autocomplete from './autocomplete.js'
import getEventTarget from './utils/event-target.js'
import { getSelectionRange, setSelectionRange } from './utils/selection.js'
import { getWord } from './utils/word.js'
import { isContentEditable } from './editors/editor-contenteditable.js'
import { isTextfieldEditor } from './editors/editor-textfield.js'
import { getTemplates } from '../store/store-content.js'

import { keybind, keyunbind } from './keybind.js'
import { swipebind, swipeunbind } from './swipe.js'

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
  let cachedRange
  let cachedEndOffset
  let cachedEndContainer
  if (isContentEditable(element)) {
    cachedRange = getSelectionRange(element)
    // workaround for Quill v1 issues when restoring focus (only when not preventing default).
    // if the editor adds a tab/space/character after pressing Tab, endOffset will change.
    // cache and force restore it later.
    if (cachedRange) {
      cachedEndOffset = cachedRange.endOffset
      cachedEndContainer = cachedRange.endContainer
    }
  }

  const template = await getTemplateByShortcut(word.text)
  if (!template) {
    return
  }

  // the range is live, so when the editor replaced the text while we looked up the template,
  // it moved to the parent and the cached offset points nowhere.
  // eg. outlook handles tab itself when the templates aren't loaded yet.
  if (cachedRange && cachedRange.endContainer !== cachedEndContainer) {
    return
  }

  // prevent default when getTemplateByShortcut returns immediately
  e.preventDefault()
  // stopImmediatePropagation to have priority over cursors
  e.stopImmediatePropagation()

  // restore selection
  element.focus({ preventScroll: true })
  if (
    isContentEditable(element)
    && cachedRange
  ) {
    // force restore endOfsset in case other characters were added after the shortcut.
    // setEnd throws past the end, eg. when the editor removed characters instead.
    const endLength = cachedEndContainer.nodeType === Node.TEXT_NODE
      ? cachedEndContainer.length
      : cachedEndContainer.childNodes.length
    if (cachedEndOffset && cachedEndOffset <= endLength) {
      cachedRange.setEnd(cachedEndContainer, cachedEndOffset)
    }

    await setSelectionRange(element, cachedRange)
  }

  autocomplete({
    template,
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
