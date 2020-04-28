/* Parse texts
 */

// TODO use method in all plugins
// split full name intro first and last
export function parseFullName (fullname = '') {
    const name = fullname.trim();
    const nameParts = name.split(' ');
    const firstName = nameParts.shift();
    const lastName = nameParts.join(' ');

    return {
        first_name: firstName,
        last_name: lastName
    };
}
