/*
 * Cursor helper
 *
 * {{cursor}}
 * {{cursor placeholder="Placeholder Text"}}
 * {{#cursor}}<div>placeholder html that will be removed on first type</div>{{/cursor}}
 *
 */

import { escapeExpression, SafeString } from 'handlebars'

import { cursorMarker } from '../cursors.js'

export default function cursor (options) {
  // default to using the placeholder option
  let placeholder = escapeExpression(options.hash.placeholder || '')

  // but support being used as a block
  if (options.fn) {
    placeholder = options.fn(this)
  }

  return new SafeString(`${cursorMarker}${placeholder}${cursorMarker}`)
}
