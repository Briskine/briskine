// new random choice helper
import Handlebars from 'handlebars'

function random (...args) {
  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  return params[Math.floor(Math.random() * params.length)]
}

Handlebars.registerHelper('random', random)

