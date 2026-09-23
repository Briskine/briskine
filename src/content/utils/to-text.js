/*
 * Text a helper can work with.
 *
 * Values that render as text carry their own toString, the way the css helper's
 * matches do. Anything else, like a plain object, has nothing useful to say.
 *
 */

export default function toText (value) {
  if (typeof value === 'string') {
    return value
  }

  if (value && Object.hasOwn(value, 'toString')) {
    return value.toString()
  }

  return ''
}
