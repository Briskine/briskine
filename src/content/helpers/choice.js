// random choice helper
// {{ choice 'one, two, three' }}

import Handlebars from 'handlebars'

function choice (args) {
  // split by comma and trim
  args = args.split(',').map((a) => a.trim())
  return args[Math.floor(Math.random() * args.length)]
}

Handlebars.registerHelper('choice', choice)
