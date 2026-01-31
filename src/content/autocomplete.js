/*
 * Generic methods for autocompletion
 */

import { run } from './plugin.js'
import { addAttachments } from './attachments/attachments.js'
import parseTemplate from './utils/parse-template.js'
import htmlToText from './utils/html-to-text.js'
import debug from '../debug.js'

import { insertPasteTemplate } from './editors/editor-paste.js'
import { insertContentEditableTemplate } from './editors/editor-contenteditable.js'
import { insertBeforeInputTemplate } from './editors/editor-beforeinput.js'
import { insertQuill1Template } from './editors/editor-quill1.js'
import { insertTextfieldTemplate } from './editors/editor-textfield.js'
import { insertExecCommandTemplate } from './editors/editor-execcommand.js'

import './plugins/gmail.js'
import './plugins/outlook.js'
import './plugins/gmail-mobile.js'
import './plugins/linkedin.js'
import './plugins/linkedin-sales-navigator.js'
import './plugins/facebook.js'

import { updateTemplateStats } from '../store/store-content.js'

const editors = [
  // order matters
  insertPasteTemplate,
  insertBeforeInputTemplate,
  insertQuill1Template,
  insertContentEditableTemplate,
  insertTextfieldTemplate,
]

async function insertTemplate ({ element, word, template, html, text }) {
  const params = {
    element,
    word,
    template,
    html,
    text,
  }

  for (const editor of editors) {
    try {
      const result = await editor(params)
      if (result === true) {
        return true
      }
    } catch (err) {
      await insertExecCommandTemplate(params)
      debug(['insertTemplate', editor.name, err])
      return true
    }
  }

  return false
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
