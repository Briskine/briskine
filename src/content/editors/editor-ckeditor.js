/*
 * TODO - DEPRECATED TO BE REMOVED.
 *
 * CKEditor 5 support.
 * https://ckeditor.com/ckeditor-5/
 */

import { request } from '../page/page-parent.js'
import getActiveElement from '../utils/active-element.js'

export function isCkEditor (element) {
  return element?.classList?.contains?.('ck-editor__editable')
}

export function insertCkEditorTemplate({ word, template, html }) {
  const removeShortcut = (
    template.shortcut
    && word.text === template.shortcut
  )

  return request('ckeditor-insert', {
    removeShortcut: removeShortcut,
    html: html,
  })
}

// runs in the page context
export function pageInsertCkEditorTemplate ({ removeShortcut, html }) {
  const element = getActiveElement()
  // editor is the ckeditorInstance.
  const editor = element.ckeditorInstance
  if (!editor) {
    return
  }

  editor.model.change((writer) => {
    // remove template shortcut
    if (removeShortcut) {
      // select the previous word,
      // our template shortcuts cut at word boundaries (eg. space).
      writer.model.modifySelection(editor.model.document.selection, {
        direction: 'backward',
        unit: 'word',
      })
    }

    // convert the html string to a ckeditor fragment.
    const viewFragment = editor.data.processor.toView(html)
    const modelFragment = editor.data.toModel(viewFragment)

    writer.model.insertContent(modelFragment)
  })
}
