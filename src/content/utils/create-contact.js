/* Parse texts
 */

// split full name intro first and last
function parseFullName (fullname = '') {
  const name = fullname.trim()
  const nameParts = name.split(' ')
  const firstName = nameParts.shift()
  const lastName = nameParts.join(' ')

  return {
    name: name,
    first_name: firstName,
    last_name: lastName,
  }
}

const props = ['email', 'name', 'first_name', 'last_name']
export default function createContact (contact = {}) {
  const parsed = parseFullName(contact.name)
  for (const p of props) {
    parsed[p] = contact[p] || parsed[p] || ''
  }
  return parsed
}
