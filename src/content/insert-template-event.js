import { eventInsertTemplate } from '../config.js'
import autocomplete from './autocomplete.js'
import { on, off } from '../store/store-content.js'
import getActiveElement from './utils/active-element.js'

function insertTemplate ({ template = {} }) {
  const element = getActiveElement()

  autocomplete({
    element: element,
    template: template,
  })
}

export function setup () {
  on(eventInsertTemplate, insertTemplate)
}

export function destroy () {
  off(eventInsertTemplate, insertTemplate)
}
