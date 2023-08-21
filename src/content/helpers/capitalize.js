// capitalize string helper
import Handlebars from 'handlebars'

function capitalize (str = '') {
  if (typeof str !== 'string') {
    return ''
  }

  return str.charAt(0).toUpperCase() + str.slice(1)
}

Handlebars.registerHelper('capitalize', capitalize)

function capitalizeAll (str = '') {
  if (typeof str !== 'string') {
    return ''
  }

  return str.replace(/\w\S*/g, function(word) {
    return capitalize(word)
  })
}

Handlebars.registerHelper('capitalizeAll', capitalizeAll)
