// string handlebars helpers

import Handlebars from 'handlebars'

function split (str = '', character = ',') {
  if (typeof str !== 'string') {
    return ''
  }

  return str.split(character)
}

Handlebars.registerHelper('split', split)
