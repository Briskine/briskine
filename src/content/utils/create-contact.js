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
    last_name: lastName
  }
}

export default function createContact (contact = {}) {
  return Object.assign(
    {
      email: '',
      name: '',
      first_name: '',
      last_name: ''
    },
    parseFullName(contact.name || ''),
    contact,
  )
}
