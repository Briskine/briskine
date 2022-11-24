/*
 * Key bindings
 */
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

let keyboard
let cachedTargetBody

export function keybind (key = '', callback = () => {}) {
  if (
    // initialize mousetrap only on first keybind,
    // to delay adding keydown/keyup/keypress event listeners.
    // mousetrap adds them immediately when it self-initializes.
    // we need to be able to delay adding them
    // for websites which remove them on load (eg. salesforce).
    !keyboard ||
    // when the document body was rewrote (eg. in an iframe, where we have multiple startup retries)
    // we need to re-initialize mousetrap,
    // to re-attach the event listeners.
    (
      keyboard.target &&
      keyboard.target.body &&
      keyboard.target.body !== cachedTargetBody
    )
  ) {
    keyboard = new Mousetrap(document, true)
    cachedTargetBody = document.body
  }

  return keyboard.bindGlobal(key, callback)
}

export function keyunbind (key = '') {
  return keyboard.unbind(key)
}
