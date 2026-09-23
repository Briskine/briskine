/*
 * TODO DEPRECATED
 * Legacy {{domain}} helper
 *
 * extracts and prettifies the domain name from an email address
 *
 */

import toText from '../utils/to-text.js'

function underscored (str) {
  return str.replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase().trim()
}

function titleize (str) {
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, function (c) {
    return c.toUpperCase()
  })
}

function humanize (str) {
  return titleize(underscored(str).replace(/_id$/, '').replace(/_/g, ' '))
}

export default function domain (input) {
  const text = toText(input)
  if (!text) {
    return input
  }

  var split = text.split('@') // contact@AWESOME-sweet-bakery.co.uk
  if (split.length !== 2) {
    return text
  }
  var tld = split[1] // AWESOME-sweet-bakery.co.uk
  var domain = tld.split('.')[0] // AWESOME-sweet-bakery
  return humanize(domain) // Awesome Sweet Bakery
}
