/* Universal plugin
 * When no other plugin matches.
 */

import {parseTemplate} from '../utils.js'
import {insertTemplate} from '../utils/editor-generic.js'

import {isCkEditor, insertCkEditorTemplate} from '../editors/editor-ckeditor.js'

export default (params = {}) => {
    const parsedTemplate = parseTemplate(params.quicktext.body, {});
    const updatedParams = Object.assign({
      text: parsedTemplate
    }, params)

    if (isCkEditor(params)) {
      insertCkEditorTemplate(updatedParams)
      return true
    }

    insertTemplate(updatedParams)
    return true
}
