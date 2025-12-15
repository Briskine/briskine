import config from '../config.js'
import {autocomplete, getSelectedWord} from './autocomplete.js'

function insertTemplate (e) {
  const word = getSelectedWord({
    element: e.target,
  })

  autocomplete({
    element: e.target,
    word: word,
    template: e.detail,
  })
}

export function setup () {
  window.addEventListener(config.eventInsertTemplate, insertTemplate)
}

export function destroy () {
  window.removeEventListener(config.eventInsertTemplate, insertTemplate)
}
