/*
 * Key bindings
 */
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

let mt

export function keybind (key = '', callback = () => {}) {
  if (
    // initialize mousetrap only on first keybind,
    // to delay adding keydown/keyup/keypress event listeners.
    // mousetrap adds them immediately when it self-initializes.
    // we need to be able to delay adding them
    // for websites which remove them on load (eg. salesforce).
    !mt
  ) {
    // TODO BUG binding mousetrap on window prevents keyunbind from working
    mt = new Mousetrap(window, {
      capture: true,
    })
  }

  return mt.bindGlobal(key, callback)
}

export function keyunbind (key = '') {
  if (mt) {
    return mt.unbind(key)
  }

  return
}
