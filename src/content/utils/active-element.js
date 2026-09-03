// returns the active element
// with support for shadow dom.

import getEventTarget from './event-target.js'
import { addFocusListeners } from './shadow-focus.js'
import { isExtensionElement } from './extension-element.js'
import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'

let removeFocusListeners = () => {}
let activeElement = null

export function getActiveElement (live = false) {
  if (
    // if live, we only return the current activeElement,
    // not the cached one.
    !live
    && activeElement
    // the cached element might have been removed from the dom
    // since it was last focused.
    && activeElement.isConnected
  ) {
    return activeElement
  }

  let element = document.activeElement
  while (element?.shadowRoot?.activeElement) {
    element = element.shadowRoot.activeElement
  }

  return element
}

function setActiveElement (e) {
  const target = getEventTarget(e)
  // keep pointing at the editor when focus moves into our own ui
  if (isExtensionElement(target)) {
    return
  }

  if (isTextfieldEditor(target) || isContentEditable(target)) {
    activeElement = target
  }
}

export function setup () {
  removeFocusListeners = addFocusListeners(setActiveElement, 'focusin')
}

export function destroy() {
  removeFocusListeners()
  activeElement = null
}
