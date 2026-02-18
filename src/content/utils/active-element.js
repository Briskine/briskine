// returns the active element
// with support for shadow dom.

import getEventTarget from './event-target.js'
import { addFocusListeners } from './shadow-focus.js'
import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'

let removeFocusListeners = () => {}
let activeElement = null

export function getActiveElement () {
  if (activeElement) {
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
  const root = target.getRootNode()
  const host = root.host
  if (
    host
    && (
      host.tagName.toLowerCase().includes('b-dialog')
      || host.tagName.toLowerCase().includes('b-bubble')
    )
  ) {
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
