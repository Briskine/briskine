/*
 * Site-specific meta editor.
 *
 * Used to force a specific editor for a specific site,
 * where we're having issues with the third-party editor-specific editors.
 * (e.g., because their paste handlers are broken or badly implemented).
 *
 */

import getActiveElement from '../utils/active-element.js'
import { insertExecCommandTemplate } from './editor-execcommand.js'

function isLinkedInMessageEditor (element) {
  return (
    window.location.host === 'www.linkedin.com'
    && element?.classList?.contains?.('msg-form__contenteditable')
  )
}

function isJiraRichTextEditor (element) {
  return (
    document.title.endsWith('- Jira')
    && element?.classList?.contains?.('ProseMirror')
  )
}

export async function insertSiteTemplate ({ html, text }) {
  const element = getActiveElement()
  if (isLinkedInMessageEditor(element)) {
    // workaround for issues with inserting templates in the linkedin message editor.
    // we can use the paste editor later if they fix their paste handler.
    // currently, with the paste handler, after inserting the cursor is placed at the start,
    // not at the end of the template.
    // we need to use execCommand instead of contenteditable insert to preserve newlines,
    // since the editor only supports plain-text.
    // KNOWN BUGS (only on firefox):
    // - when selecting the entire message content with ctrl+a,
    //   then inserting a template, text will appear in the placeholder color,
    //   because we remove the nested <p> node in the editor.
    // - when inserting a template in a blank editor, with the dialog,
    //   there will be an empty space char before the template,
    //   because the editor keeps it there when it's empty.

    // on firefox, the editor needs the extra input input event to notice we've
    // focused/restored the selection.
    element.dispatchEvent(new Event('input', {bubbles: true}))

    return insertExecCommandTemplate({
      // plain text only
      html: text,
      text,
    })
  }

  if (isJiraRichTextEditor(element)) {
    // when pasting formatted (html) content over an existing selection
    // (e.g., after we select the shortcut)
    // after the content is pasted the cursor is placed at the *start*, not at the end.
    // also, their "floating paste button", that lets you customize the type of
    // pasted content (html, plain, markdown), will sometimes duplicate content
    // when selecting a different type.
    // this is a bug on their end and also happens when manually performing the action
    // (copy formatted - html text, select text in the editor, paste)
    // not only with our synthetic paste event.
    // using execCommand disables their "floating paste button", but fixes the issues.
    // we can use the paste editor later if they fix their paste handler.
    return insertExecCommandTemplate({
      html,
      text,
    })
  }

  return false
}
