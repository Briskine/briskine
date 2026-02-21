/*
 * Cursor helper
 *
 * {{cursor}}
 * {{#cursor}}<div>placeholder html that will be removed on first type</div>{{/cursor}}
 *
 */

import { SafeString } from 'handlebars'

import { cursorMarker } from '../cursors/cursors.js'

export default function cursor (options) {
  let placeholder = ''
  if (options.fn) {
    placeholder = options.fn(this)
  }

  return new SafeString(`${cursorMarker}${placeholder}${cursorMarker}`)
}
