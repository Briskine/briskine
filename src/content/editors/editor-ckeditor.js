/* CKEditor 5 support.
 * https://ckeditor.com/ckeditor-5/
 */

import {sendToPage} from '../page/page-parent.js'

export function isCkEditor (element) {
  return element.classList.contains('ck-editor__editable')
}

export function insertCkEditorTemplate (params = {}) {
  const selection = window.getSelection()
  const range = selection.getRangeAt(0)
  const focusNode = selection.focusNode

  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()
  }

  // HACK
  // give it a second to update the editor state,
  // after removing the shortcut.
  setTimeout(() => {
    sendToPage({
      type: 'ckeditor-insert',
      data: params.text,
    })
  })
}

// runs in the page context
export function insertCkEditorText (node, content = '') {
  const editor = node.ckeditorInstance

  // editor is the ckeditorInstance.
  // convert the html string to a ckeditor fragment.
  const viewFragment = editor.data.processor.toView(content)
  const modelFragment = editor.data.toModel(viewFragment)

  editor.model.insertContent(modelFragment)
}
