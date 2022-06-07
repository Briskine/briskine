/*
 * Key bindings
 */
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

export function keybind (key = '', callback = () => {}) {
  return Mousetrap.bindGlobal(key, callback)
}

export function keyunbind (key = '') {
  return Mousetrap.unbind(key)
}
