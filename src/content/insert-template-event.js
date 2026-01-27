import { eventInsertTemplate } from '../config.js'
import autocomplete from './autocomplete.js'
import { on, off } from '../store/store-content.js'
import getActiveElement from './utils/active-element.js'
import { getWord } from './utils/word.js'

function insertTemplate ({ template = {} }) {
  const element = getActiveElement()
  const word = getWord(element)

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
