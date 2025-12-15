/* Universal plugin
 * When no other plugin matches.
 */

import parseTemplate from '../utils/parse-template.js'
import {insertTemplate} from '../editors/editor-universal.js'
import {addAttachments} from '../attachments/attachments.js'

export default async (params = {}) => {
  const parsedTemplate = addAttachments(
    await parseTemplate(params.template.body, {}),
    params.template.attachments,
  )
  const updatedParams = Object.assign({text: parsedTemplate}, params)

  insertTemplate(updatedParams)
  return true
}
