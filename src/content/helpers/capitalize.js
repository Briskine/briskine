// capitalize string helper
export function capitalize (str = '') {
  if (typeof str !== 'string') {
    return ''
  }

  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function capitalizeAll (str = '') {
  if (typeof str !== 'string') {
    return ''
  }

  return str.replace(/\w\S*/g, function(word) {
    return capitalize(word)
  })
}
