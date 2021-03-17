/* Insert plain text
 */

// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements
const blockNodes = [
    'address',
    'article',
    'aside',
    'blockquote',
    'details',
    'dialog',
    'dd',
    'div',
    'dl',
    'dt',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'hr',
    'li',
    'main',
    'nav',
    'ol',
    'p',
    'pre',
    'section',
    'table',
    'ul'
];


/* Convert a DOM tree to plain text.
 * Similar to a HTML to Markdown converter,
 * it supports:
 *  - decorating list items
 *  - decorating a href links
 *  - add newlines after block-level elements
 */
function domTreeToText (node, newline = '') {
    if (node.childNodes.length) {
        return Array.from(node.childNodes).map((c, i) => {
            let text = domToText(c, newline);

            if (c.nodeType === document.ELEMENT_NODE) {
                const tagName = c.tagName.toLowerCase();
                // tag decorators
                if (tagName === 'li') {
                    text = `- ${text}`;
                }

                // only if the text and href are different
                if (tagName === 'a' && c.textContent !== c.href) {
                    text = `${text} (${c.href})`;
                }

                // add newlines to block-level nodes,
                // don't add newline to first element in group.
                if (blockNodes.includes(tagName) && i !== 0) {
                    text = newline + text;
                }
            }

            return text;
        }).join('');
    }

    return node.textContent;
}

// zero-width whitespace
const whitespace = '\u200b';

// default newline separator is zero-width whitespace + standard newline.
// this is required to be able to later remove possible double newlines.
function domToText (fragment, newline) {
    const customNewline = `${whitespace}${newline}`;
    const text = domTreeToText(fragment, customNewline);
    // clean-up possible double newlines caused
    // by converting the tree to text.
    const findDoubleNewlines = new RegExp(`${newline}${customNewline}`, 'g');
    const cleanedNewlineText = text.replace(findDoubleNewlines, newline);
    // turn the custom newlines into normal newlines,
    // to avoid inserting special characters.
    return cleanedNewlineText.replace(new RegExp(customNewline, 'g'), newline);
}

export function htmlToText (html, newline = '\n') {
    const range = document.createRange();
    const fragment = range.createContextualFragment(html);
    return domToText(fragment, newline);
}
