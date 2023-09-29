// conditional or helper
import Handlebars from 'handlebars'

function or (...args) {
  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  return params.find((p) => Boolean(p))
}

Handlebars.registerHelper('or', or)

