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

// returns the event target
// with support for composed events from shadow dom
export function getEventTarget (e) {
  // get target from shadow dom if event is composed
  if (e.composed) {
    const composedPath = e.composedPath()
    if (composedPath[0]) {
      return e.composedPath()[0]
    }
  }

  return e.target
}

// getSelection that pierces through shadow dom.
// Blink returns the shadow root when using window.getSelection, and the focus is a shadow dom,
// but adds a non-standard getSelection method on the shadow root.
// https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot#instance_methods
// Firefox pierces through shadow dom by default, with window.getSelection.
// Safari has the same behaviour as Blink, but provides no workarounds,
// so getting the selection from shadow dom is not possible there.
// We'll have to refactor the selection handling after the upcoming getComposedRange method is implemented:
// https://github.com/WICG/webcomponents/issues/79
export function getSelection (node) {
  if (node) {
    const rootNode = node.getRootNode()
    if (rootNode instanceof ShadowRoot && typeof rootNode.getSelection === 'function') {
      // HACK non-standard Blink-only method
      return rootNode.getSelection()
    }
  }

  return window.getSelection()
}

export function getSelectedWord (params) {
  let beforeSelection = ''
  const selection = getSelection(params.element)

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

  // all regular and special whitespace chars we want to find.
  // https://jkorpela.fi/chars/spaces.html
  // we can't use regex \S to match the first non-whitespace character,
  // because it also considers special chars like zero-width-whitespace as non-whitespace.
  const spaces = [
    '\n', //newline
    '\u0020', // space
    '\u00A0', // no-break space
    '\u200B', // zero width whitespace
    '\uFEFF', // zero width no-break space
  ]

  // will return -1 from lastIndexOf,
  // if no whitespace is preset before the word.
  const lastWhitespace = Math.max(...spaces.map((char) => beforeSelection.lastIndexOf(char)))

  // first character is one index away from the last whitespace
  const start = 1 + lastWhitespace
  const text = beforeSelection.substring(start)
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
