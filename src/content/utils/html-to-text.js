/* Convert HTML to plain text
 */

import {htmlToText as htmlToTextConverter} from 'html-to-text';

function isHtml (html) {
  const template = document.createElement('template')
  template.innerHTML = html
  return Boolean(template.content.children.length)
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
