/*
 * Generic methods for autocompletion
 */

import {register, run as runPlugins} from './plugin.js'
import gmailPlugin from './plugins/gmail.js'
import facebookPlugin from './plugins/facebook.js'
import fastmailPlugin from './plugins/fastmail.js'
import linkedinPlugin from './plugins/linkedin.js'
import outlookPlugin from './plugins/outlook.js'
import zendeskPlugin from './plugins/zendesk.js'
import crmPlugin from './plugins/crm.js'
import universalPlugin from './plugins/universal.js'

import htmlToText from './utils/html-to-text.js'
import store from '../store/store-client.js'
import {isContentEditable} from './editors/editor-contenteditable.js'

// register plugins,
// in execution order.
register(gmailPlugin)
register(facebookPlugin)
register(fastmailPlugin)
register(linkedinPlugin)
register(outlookPlugin)
register(zendeskPlugin)
register(crmPlugin)
register(universalPlugin)

export function getSelectedWord (params) {
  let beforeSelection = ''
  const selection = window.getSelection()

  if (isContentEditable(params.element)) {
    switch (selection.focusNode.nodeType) {
      // In most cases, the focusNode property refers to a Text Node.
      case (document.TEXT_NODE):
        // for text nodes take the text until the focusOffset
        beforeSelection = selection.focusNode.textContent.substring(0, selection.focusOffset)
        break
      case (document.ELEMENT_NODE):
        // when we have an element node,
        // focusOffset returns the index in the childNodes collection of the focus node where the selection ends.
        if (
          // focusOffset is larger than childNodes length when editor is empty
          selection.focusNode.childNodes[selection.focusOffset]
        ) {
          beforeSelection = selection.focusNode.childNodes[selection.focusOffset].textContent
        }
        break
    }
  } else {
    beforeSelection = params.element.value.substring(0, params.element.selectionEnd)
  }

  const start = 1 + Math.max(
      beforeSelection.lastIndexOf(' '),
      beforeSelection.lastIndexOf('\xa0'),
      beforeSelection.lastIndexOf('\n'),
    )
  const text = beforeSelection.substring(start)
  const end = start + text.length

  console.log(selection.focusNode, selection.focusOffset, beforeSelection)
  // TODO gets wrong word when in the middle of the inserted broken template
  console.log(start, end, text)

  return {
    start: start,
    end: end,
    text: text,
  }
}

export function autocomplete (params) {
  runPlugins(Object.assign({}, params))

  // updates word stats
  const wordCount = htmlToText(params.quicktext.body).split(' ').length
  store.getExtensionData().then((data) => {
    store.setExtensionData({
      words: data.words + wordCount
    })
  })

  store.updateTemplateStats(params.quicktext.id)
}
