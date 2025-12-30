/* Convert HTML to plain text
 */

import {compile} from 'html-to-text'

const parserOptions = {
  wordwrap: false,
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

// very naive html-in-string check,
// so we can match broken html which doesn't result in any real nodes,
// and also not parse the original html on the page
// (in a virtual node, template element, or DOMParser)
// because the LinkedIn sanitizer uses trusted types.
function isHtml (html = '') {
  if (
    // if it contains the &nbsp; entity,
    // used for consecutive spaces,
    // we need to convert it to whitespace.
    !html.includes('&nbsp;')
    && !html.includes('<')
    && !html.includes('>')
  ) {
    return false
  }

  return true
}

export default function htmlToText (html) {
  if (isHtml(html)) {
    return htmlToTextConverter(html)
  }

  return html
}
