import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'

export default function isEditor (element) {
  return isTextfieldEditor(element) || isContentEditable(element)
}
