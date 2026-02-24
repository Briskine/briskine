/*
 * Key bindings
 */
import Mousetrap from 'mousetrap'

import { isTextfieldEditor } from './editors/editor-textfield.js'
import { isContentEditable } from './editors/editor-contenteditable.js'
import { getActiveElement } from './utils/active-element.js'

Mousetrap.prototype.stopCallback = function () {
  const element = getActiveElement(true)
  if (isTextfieldEditor(element) || isContentEditable(element)) {
    return false
  }

  return true
}

let mt
let abortController = new AbortController()

export function keybind (key = '', callback = () => {}) {
  // initialize mousetrap only on first keybind,
  // to delay adding keydown/keyup/keypress event listeners.
  // mousetrap adds them immediately when it self-initializes.
  if (!mt) {
    mt = new Mousetrap(window, {
      capture: true,
      signal: abortController.signal,
    })
  }

  return mt.bind(key, callback)
}

export function keyunbind (key = '') {
  if (mt) {
    return mt.unbind(key)
  }
}

export function destroy () {
  abortController.abort()
  abortController = new AbortController()
  mt = null
}
