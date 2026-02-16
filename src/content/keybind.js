/*
 * Key bindings
 */
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

let mt
let cachedTargetBody

export function keybind (key = '', callback = () => {}) {
  if (
    // initialize mousetrap only on first keybind,
    // to delay adding keydown/keyup/keypress event listeners.
    // mousetrap adds them immediately when it self-initializes.
    // we need to be able to delay adding them
    // for websites which remove them on load (eg. salesforce).
    !mt
    // when the document body was recreated (eg. can happen in a dynamic iframe
    // that uses document write, in which we have multiple startup retries)
    // we need to re-initialize mousetrap,
    // to re-attach the event listeners.
    || mt?.target?.body !== cachedTargetBody
  ) {
    mt = new Mousetrap(window, {
      capture: true,
    })
    cachedTargetBody = document.body
  }

  return mt.bindGlobal(key, callback)
}

export function keyunbind (key = '') {
  if (mt) {
    return mt.unbind(key)
  }

  return
}
