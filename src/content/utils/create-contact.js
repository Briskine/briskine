/* Parse texts
 */

// split full name intro first and last
function parseFullName (fullname = '') {
  const clean = fullname.trim()
  let first = ''
  let last = ''
  if (clean.includes(',')) {
    const parts = clean.split(',')
    last = parts.shift()
    first = parts.join('')
  } else {
    const parts = clean.split(' ')
    first = parts.shift()
    last = parts.join(' ')
  }

  first = first?.trim?.()
  last = last?.trim?.()
  const name = (`${first} ${last}`).trim()

  return {
    name: name,
    first_name: first,
    last_name: last,
  }
}

const props = ['email', 'name', 'first_name', 'last_name']
export default function createContact (contact = {}) {
  const parsed = parseFullName(contact.name)
  for (const p of props) {
    parsed[p] = parsed[p] || contact[p] || ''
  }
  return parsed
}
