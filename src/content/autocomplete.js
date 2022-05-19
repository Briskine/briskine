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
      case (document.TEXT_NODE): // for text nodes it's easy. Just take the text and find the closest word
        beforeSelection = selection.focusNode.textContent
        break
      // However, in some cases it may refer to an Element Node
      case (document.ELEMENT_NODE):
        // In that case, the focusOffset property returns the index in the childNodes collection of the focus node where the selection ends.
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

  // Replace all &nbsp; with normal spaces
  beforeSelection = beforeSelection.replace('\xa0', ' ').trim()

  // TODO BUG probably related to selected word
  // if we add a couple of spaces before the keyboard shortcut
  // when we insert the template - with keyboard or dialog
  // part of the shortcut is still there, and focus is set before the last character of it.
  // eg. type <space><space><space>nic<Tab>

  const start = 1 + Math.max(
      beforeSelection.lastIndexOf(' '),
      beforeSelection.lastIndexOf('\n'),
      beforeSelection.lastIndexOf('<br>'),
    )
  const text = beforeSelection.substr(start)
  const end = start + text.length

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
