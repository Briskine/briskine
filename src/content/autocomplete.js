/*
 * Generic methods for autocompletion
 */

import { run } from './plugin.js'
import { addAttachments } from './attachments/attachments.js'
import parseTemplate from './utils/parse-template.js'

import {isContentEditable, insertContentEditableTemplate} from './editors/editor-contenteditable.js'
import {isCkEditor, insertCkEditorTemplate} from './editors/editor-ckeditor.js'
import {isPasteEditor, insertPasteTemplate} from './editors/editor-paste.js'
import {isBeforeInputEditor, insertBeforeInputTemplate} from './editors/editor-beforeinput.js'
import {isQuill, insertQuillTemplate} from './editors/editor-quill.js'
import {insertTextareaTemplate} from './editors/editor-textarea.js'

import './plugins/gmail.js'
import './plugins/outlook.js'
import './plugins/gmail-mobile.js'
import './plugins/linkedin.js'
import './plugins/linkedin-sales-navigator.js'
import './plugins/facebook.js'

import { updateTemplateStats } from '../store/store-content.js'

function insertTemplate (params = {}) {
  if (isCkEditor(params.element)) {
    return insertCkEditorTemplate(params)
  }

  if (isPasteEditor(params.element)) {
    return insertPasteTemplate(params)
  }

  if (isBeforeInputEditor(params.element)) {
    return insertBeforeInputTemplate(params)
  }

  if (isQuill(params.element)) {
    return insertQuillTemplate(params)
  }

  if (isContentEditable(params.element)) {
    return insertContentEditableTemplate(params)
  }

  return insertTextareaTemplate(params)
}

export default async function autocomplete ({element, word, template}) {
  const withAttachments = addAttachments(template.body, template.attachments)
  const data = await run('data', { element })
  const html = await parseTemplate(withAttachments, data)

  insertTemplate({
    element: element,
    word: word,
    template: template,

    // TODO rename
    // send html and text params
    text: html,
  })

  await run('actions', {
    element: element,
    template: template,
    data: data,
  })

  await updateTemplateStats(template)
}
