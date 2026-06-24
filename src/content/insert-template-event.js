import { eventInsertTemplate } from '../config.js'
import autocomplete from './autocomplete.js'
import { on, off } from '../store/store-content.js'
import { getActiveElement } from './utils/active-element.js'
import { isTextfieldEditor } from './editors/editor-textfield.js'
import { isContentEditable } from './editors/editor-contenteditable.js'

function insertTemplate ({ template = {} }) {
  let element = getActiveElement()
  // if it's not an editable element
  // don't trigger anything
  if (!isTextfieldEditor(element) && !isContentEditable(element)) {
    return
  }

  autocomplete({
    template: template,
  })
}

export function setup () {
  on(eventInsertTemplate, insertTemplate)
}

export function destroy () {
  off(eventInsertTemplate, insertTemplate)
}
