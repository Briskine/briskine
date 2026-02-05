import { eventInsertTemplate } from '../config.js'
import autocomplete from './autocomplete.js'
import { on, off } from '../store/store-content.js'

function insertTemplate ({ template = {} }) {
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
