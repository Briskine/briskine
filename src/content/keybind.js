/*
 * Key bindings
 */
import hotkeys from 'hotkeys-js'

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

hotkeys.filter = function (e) {
  return e.target.isContentEditable || isTextfield(e.target)
}

export function keybind (key = '', callback = () => {}) {
  return hotkeys(key, {capture: true}, callback)
}

export function keyunbind (key = '') {
  return hotkeys.unbind(key)
}
