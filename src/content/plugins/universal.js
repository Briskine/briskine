/* Universal plugin
 * When no other plugin matches.
 */

import {parseTemplate} from '../utils.js'
import {insertTemplate} from '../editors/editor-universal.js'

export default (params = {}) => {
  const parsedTemplate = parseTemplate(params.quicktext.body, {})
  const updatedParams = Object.assign({text: parsedTemplate}, params)

  insertTemplate(updatedParams)
  return true
}
