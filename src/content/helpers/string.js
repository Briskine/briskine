// general purpose string helper
import Handlebars from 'handlebars'

function string (str = '', method, ...args) {
  if (typeof str !== 'string' || typeof method !== 'string') {
    return ''
  }

  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  return str[method].apply(str, params)
}

Handlebars.registerHelper('string', string)

