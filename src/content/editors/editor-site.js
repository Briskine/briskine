/*
 * Site-specific editor.
 * Used to trigger an editor for a specific site,
 * where we're having issues with the third-party editor-specific editors.
 * (e.g., because their paste handlers are broken or badly implemented)
 *
 */

import { insertExecCommandTemplate } from './editor-execcommand.js'

function isLinkedInMessageEditor (element) {
  return (
    window.location.host === 'www.linkedin.com'
    && element?.classList?.contains?.('msg-form__contenteditable')
  )
}

export async function insertSiteTemplate ({ element, template, word, html, text }) {
  if (isLinkedInMessageEditor(element)) {
    // workaround for issues with inserting templates in the linkedin message editor.
    // we need to use execCommand instead of contenteditable insert to preserve newlines.
    // KNOWN BUGS (only on firefox):
    // - when selecting the entire message content with ctrl+a,
    //   then inserting a template, text will appear in the placeholder color,
    //   because we remove the nested <p> node in the editor.
    // - when inserting a template in a blank editor, with the dialog,
    //   there will be an empty space char before the template,
    //   because the editor keeps it there when it's empty.
    return insertExecCommandTemplate({
      element,
      template,
      word,
      // plain text only
      html: text,
      text,
    })
  }

  return false
}
