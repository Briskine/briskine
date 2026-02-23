/*
 * Cursor helper
 *
 * {{cursor}}
 * {{cursor "placeholder"}} - useful for subexpressions
 * {{#cursor}}<div>placeholder html that will be removed on first type</div>{{/cursor}}
 *
 */

import { escapeExpression, SafeString } from 'handlebars'

import { cursorMarker } from '../cursors/cursors.js'

export default function cursor (...args) {
  const options = args.pop()
  const placeholder = options.fn ? options.fn(this) : escapeExpression(args[0])
  return new SafeString(`${cursorMarker}${placeholder}${cursorMarker}`)
}
