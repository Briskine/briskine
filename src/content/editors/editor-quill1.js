/* Quill1 rich text editor.
 * Used by LinkedIn on posts and comments, Gemini.
 * https://quilljs.com/
 */

import { getActiveElement } from '../utils/active-element.js'
import { insertExecCommandTemplate } from './editor-execcommand.js'

// quill v2 doesn't create the clipboard container
export function isQuill1 (element) {
  return Boolean(element?.closest?.('.ql-container')?.querySelector?.(':scope > .ql-clipboard'))
}

// quill1 drops the text of html elements it doesn't support (e.g., div),
// so we only insert plain text.
export async function insertQuill1Template ({ text }) {
  const element = getActiveElement()
  if (!isQuill1(element)) {
    return false
  }

  // don't fall through to the other editors,
  // they would change the dom under quill.
  await insertExecCommandTemplate({ text })
  return true
}
