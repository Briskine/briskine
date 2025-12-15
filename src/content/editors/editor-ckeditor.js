/* CKEditor 5 support.
 * https://ckeditor.com/ckeditor-5/
 */

import {request} from '../page/page-parent.js'

export function isCkEditor (element) {
  return element.classList.contains('ck-editor__editable')
}

export function insertCkEditorTemplate (params = {}) {
  let removeShortcut = false
  // delete shortcut
  if (params.word.text === params.template.shortcut) {
    removeShortcut = true
  }

  return request('ckeditor-insert', {
    removeShortcut: removeShortcut,
    content: params.text,
  })
}

// runs in the page context
export function pageInsertCkEditorTemplate (data = {}) {
  const element = document.activeElement
  // editor is the ckeditorInstance.
  const editor = element.ckeditorInstance
  if (!editor) {
    return
  }

  editor.model.change((writer) => {
    // remove template shortcut
    if (data.removeShortcut) {
      // select the previous word,
      // our template shortcuts cut at word boundaries (eg. space).
      writer.model.modifySelection(editor.model.document.selection, {
        direction: 'backward',
        unit: 'word',
      })
    }

    // convert the html string to a ckeditor fragment.
    const viewFragment = editor.data.processor.toView(data.content)
    const modelFragment = editor.data.toModel(viewFragment)

    writer.model.insertContent(modelFragment)
  })
}
