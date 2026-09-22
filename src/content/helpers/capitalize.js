// capitalize string helper
import toText from '../utils/to-text.js'

export function capitalize (str = '') {
  const text = toText(str)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function capitalizeAll (str = '') {
  return toText(str).replace(/\w\S*/g, function(word) {
    return capitalize(word)
  })
}
