// general purpose text helper
// can use all methods on the String object
import Handlebars from 'handlebars'

function text (str = '', method, ...args) {
  if (typeof str !== 'string' || typeof method !== 'string') {
    return ''
  }

  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  return str[method].apply(str, params)
}

Handlebars.registerHelper('text', text)

