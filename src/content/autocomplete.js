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
import { getActiveElement } from './utils/active-element.js'
import { selectFirstCursor } from './cursors/cursors.js'

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

async function insertTemplate ({ html, text }) {
  const params = {
    html,
    text,
  }

  for (const editor of editors) {
    try {
      const result = await editor(params)
      // eslint-disable-next-line no-console
      console.info('[Briskine] editor:', editor.name, '=>', result)
      if (result === true) {
        return true
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Briskine] editor error:', editor.name, err)
      debug(['insertTemplate', editor.name, err])
      // continue to next editor — don't stop the chain.
      // this ensures that if a messenger-based editor (paste, beforeinput, quill1)
      // fails because the page messenger is not connected, the chain still reaches
      // direct-DOM editors (contentEditable, textfield) which don't need the messenger.
    }
  }

  // no editor matched or succeeded. try execCommand as last resort.
  // eslint-disable-next-line no-console
  console.warn('[Briskine] no editor matched, falling back to execCommand')
  try {
    await insertExecCommandTemplate(params)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Briskine] execCommand fallback failed', err)
    debug(['insertExecCommandTemplate', err])
  }

  return false
}

export default async function autocomplete ({ template }) {
  // eslint-disable-next-line no-console
  console.info('[Briskine] autocomplete start', {shortcut: template?.shortcut, title: template?.title})

  const element = getActiveElement()
  // eslint-disable-next-line no-console
  console.info('[Briskine] active element:', element?.tagName, element?.className, 'isContentEditable=', element?.isContentEditable)

  const withAttachments = addAttachments(template.body, template.attachments)
  const data = await run('data', { element })
  // eslint-disable-next-line no-console
  console.info('[Briskine] before parseTemplate')
  const html = await parseTemplate(withAttachments, data)
  // eslint-disable-next-line no-console
  console.info('[Briskine] parseTemplate done. html length=', html?.length)
  const text = htmlToText(html)

  if (template.shortcut) {
    const word = getWord(element)
    if (word.text === template.shortcut) {
      await selectWord(element, word)
    }
  }

  await insertTemplate({
    text,
    html,
  })
  // eslint-disable-next-line no-console
  console.info('[Briskine] insertTemplate done')

  try {
    await selectFirstCursor({ text })
  } catch (err) {
    debug(['selectFirstCursor', err])
  }

  await run('actions', {
    element,
    template,
    data,
    html,
    text,
  })

  await updateTemplateStats(template)
  // eslint-disable-next-line no-console
  console.info('[Briskine] autocomplete complete')
}
