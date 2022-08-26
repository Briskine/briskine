/*
 * Key bindings
 */
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

let keyboard

export function keybind (key = '', callback = () => {}) {
  if (!keyboard) {
    // initialize mousetrap only on first keybind,
    // to delay adding keydown/keyup/keypress event listeners.
    // mousetrap adds them immediately when it self-initializes.
    // we need to be able to delay adding them
    // for websites which remove them on load (eg. salesforce).
    keyboard = new Mousetrap(document, true)
  }

  return keyboard.bindGlobal(key, callback)
}

export function keyunbind (key = '') {
  return keyboard.unbind(key)
}
