/*
 * Generic methods for autocompletion
 */

import { run } from './plugin.js'
import { addAttachments } from './attachments/attachments.js'
import parseTemplate from './utils/parse-template.js'
import htmlToText from './utils/html-to-text.js'

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

function insertTemplate ({ element, word, template, html, text }) {
  const params = {
    element,
    word,
    template,
    html,
    text,
  }

  if (isCkEditor(element)) {
    return insertCkEditorTemplate(params)
  }

  if (isPasteEditor(element)) {
    return insertPasteTemplate(params)
  }

  if (isBeforeInputEditor(element)) {
    return insertBeforeInputTemplate(params)
  }

  if (isQuill(element)) {
    return insertQuillTemplate(params)
  }

  if (isContentEditable(element)) {
    return insertContentEditableTemplate(params)
  }

  return insertTextareaTemplate(params)
}

export default async function autocomplete ({ element, word, template }) {
  const withAttachments = addAttachments(template.body, template.attachments)
  const data = await run('data', { element })
  const html = await parseTemplate(withAttachments, data)
  const text = htmlToText(html)

  await insertTemplate({
    element,
    word,
    template,
    text,
    html,
  })

  await run('actions', {
    element,
    template,
    data,
  })

  await updateTemplateStats(template)
}
