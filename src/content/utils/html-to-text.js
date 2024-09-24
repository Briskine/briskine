/* Convert HTML to plain text
 */

import {compile} from 'html-to-text'

const parserOptions = {
  wordwrap: false,
  // in addition to the default whitespace characters,
  // also convert u00A0 (no-break space),
  // used by tinymce for consecutive spaces.
  whitespaceCharacters: '\t\r\n\f\u200b\u00a0',
  selectors: [
    {
      selector: 'a',
      options: {
        hideLinkHrefIfSameAsText: true
      }
    }
  ]
}

const htmlToTextConverter = compile(parserOptions)

function isHtml (html) {
  // always true in service worker
  if (typeof document === 'undefined') {
    return true
  }

  const template = document.createElement('template')
  template.innerHTML = html
  return Boolean(template.content.children.length)
}

export default function htmlToText (html) {
  if (isHtml(html)) {
    return htmlToTextConverter(html)
  }

  return html
}
