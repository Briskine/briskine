/* Convert HTML to plain text
 */

import {htmlToText as htmlToTextConverter} from 'html-to-text';

function isHtml (html) {
    const range = document.createRange();
    const fragment = range.createContextualFragment(html);
    return !!fragment.children.length;
}

export default function htmlToText (html) {
    if (isHtml(html)) {
        return htmlToTextConverter(html, {
            wordwrap: false,
            selectors: [
                {
                    selector: 'a',
                    options: {
                        hideLinkHrefIfSameAsText: true
                    }
                }
            ]
        });
    }

    return html;
}
