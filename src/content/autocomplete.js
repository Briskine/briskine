/*
 * Generic methods for autocompletion
 */

import { run } from './plugin.js'
import { addAttachments } from './attachments/attachments.js'
import parseTemplate from './utils/parse-template.js'
import { insertTemplate } from './editors/editor-universal.js'

import './plugins/gmail.js'
import './plugins/outlook.js'
import './plugins/gmail-mobile.js'
import './plugins/linkedin.js'
import './plugins/linkedin-sales-navigator.js'
import './plugins/facebook.js'

// import './plugins/universal.js'

import { updateTemplateStats } from '../store/store-content.js'

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
