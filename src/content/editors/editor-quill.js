/* Quill rich text editor
 * https://quilljs.com/
 */

import {htmlToText} from '../utils/plain-text.js'
import {insertContentEditableTemplate} from './editor-contenteditable.js'

export function isQuill (element) {
  return element.classList.contains('ql-editor')
}

export function insertQuillTemplate (params = {}) {
  // we can only insert text content in Quill.
  // trying to insert DOM nodes will throw an error because of
  // the custom event emitter used by Quill.
  insertContentEditableTemplate(Object.assign(params, {
      text: htmlToText(params.text)
  }))
}
