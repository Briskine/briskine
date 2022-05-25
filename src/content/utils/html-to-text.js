/* Convert HTML to plain text
 */

import {htmlToText as htmlToTextConverter} from 'html-to-text';

// TODO xss unsafe
function isHtml (html) {
  const range = document.createRange()
  const fragment = range.createContextualFragment(html)
  return !!fragment.children.length
}

export default function htmlToText (html, options = {}) {
  if (isHtml(html)) {
    const parserOptions = Object.assign({
        wordwrap: false,
        selectors: [
          {
            selector: 'a',
            options: {
              hideLinkHrefIfSameAsText: true
            }
          }
        ]
      }, options)

    return htmlToTextConverter(html, parserOptions)
  }

  return html
}
