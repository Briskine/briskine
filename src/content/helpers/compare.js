// compare helper
import Handlebars from 'handlebars'

function compare (operator = '', ...args) {
  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)

  if (params.length < 2) {
    throw new Error('Helper {{compare}} needs at least two arguments.')
  }

  return params.every((item, index) => {
    if (index === 0) {
      return true
    }

    switch (operator) {
      case '==':
        return params[0] == item
      case '===':
        return params[0] === item
      case '!=':
        return params[0] != item
      case '!==':
        return params[0] !== item
      case '<':
        return params[0] < item
      case '>':
        return params[0] > item
      case '<=':
        return params[0] <= item
      case '>=':
        return params[0] >= item
      default: {
        throw new Error('Helper {{compare}}: invalid operator: `' + operator + '`')
      }
    }
  })
}

Handlebars.registerHelper('compare', compare)

