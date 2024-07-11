/* Parse texts
 */

// clean full name and remove suffixes.
// mostly for LinkedIn where can have
// "First Last, Phd" / "First Last, Ph.d" / "First Last, Phd, SLP"
function cleanFullName (fullname = '') {
  const clean = fullname ? fullname.trim() : ''
  // if the name includes a comma
  if (clean.includes(',')) {
    const parts = clean.split(',')
    const first = parts[0].trim()
    // if the first part includes a space
    if (first.includes(' ')) {
      // we consider it the full name, and discard the suffix
      return first
    }
  }

  return clean
}

// split full name into first and last
// supports "First Last" and "Last, First" formats
function parseFullName (fullname = '') {
  const clean = cleanFullName(fullname)
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
