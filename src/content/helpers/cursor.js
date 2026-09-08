/*
 * Cursor helper
 *
 * {{cursor}}
 * {{cursor "placeholder"}} - useful for subexpressions
 * {{#cursor}}<div>placeholder html that will be removed on first type</div>{{/cursor}}
 *
 */

import { escapeExpression, SafeString } from '../../briskbars/briskbars.js'

import { cursorMarker } from '../cursors/cursors.js'

export default async function cursor (...args) {
  const options = args.pop()
  const placeholder = options.fn ? await options.fn(this) : escapeExpression(args[0])
  return new SafeString(`${cursorMarker}${placeholder}${cursorMarker}`)
}
