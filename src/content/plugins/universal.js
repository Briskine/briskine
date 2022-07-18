/* Universal plugin
 * When no other plugin matches.
 */

import parseTemplate from '../utils/parse-template.js'
import {insertTemplate} from '../editors/editor-universal.js'

export default async (params = {}) => {
  const parsedTemplate = await parseTemplate(params.quicktext.body, {})
  const updatedParams = Object.assign({text: parsedTemplate}, params)

  insertTemplate(updatedParams)
  return true
}
