import { eventInsertTemplate } from '../config.js'
import {autocomplete, getSelectedWord} from './autocomplete.js'
import { on, off } from '../store/store-content.js'
import getActiveElement from './active-element.js'

function insertTemplate ({ template = {} }) {
  const element = getActiveElement()
  const word = getSelectedWord({
    element: element,
  })

  autocomplete({
    element: element,
    word: word,
    template: template,
  })
}

export function setup () {
  on(eventInsertTemplate, insertTemplate)
}

export function destroy () {
  off(eventInsertTemplate, insertTemplate)
}
