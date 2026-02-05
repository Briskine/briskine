/*
 * Generic methods for autocompletion
 */

import { run } from './plugin.js'
import { addAttachments } from './attachments/attachments.js'
import parseTemplate from './utils/parse-template.js'
import htmlToText from './utils/html-to-text.js'
import debug from '../debug.js'
import { getWord, selectWord } from './utils/word.js'
import { updateTemplateStats } from '../store/store-content.js'

import { insertPasteTemplate } from './editors/editor-paste.js'
import { insertContentEditableTemplate } from './editors/editor-contenteditable.js'
import { insertBeforeInputTemplate } from './editors/editor-beforeinput.js'
import { insertQuill1Template } from './editors/editor-quill1.js'
import { insertTextfieldTemplate } from './editors/editor-textfield.js'
import { insertExecCommandTemplate } from './editors/editor-execcommand.js'
import { insertSiteTemplate } from './editors/editor-site.js'

import './plugins/gmail.js'
import './plugins/outlook.js'
import './plugins/gmail-mobile.js'
import './plugins/linkedin.js'
import './plugins/linkedin-sales-navigator.js'
import './plugins/facebook.js'

const editors = [
  // order matters
  insertSiteTemplate,
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

export default async function autocomplete ({ element, template }) {
  const withAttachments = addAttachments(template.body, template.attachments)
  const data = await run('data', { element })
  const html = await parseTemplate(withAttachments, data)
  const text = htmlToText(html)

  if (template.shortcut) {
    const word = getWord(element)
    if (word.text === template.shortcut) {
      await selectWord(element, word)
    }
  }

  await insertTemplate({
    element,
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
