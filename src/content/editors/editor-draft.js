/* Draft.js rich text editor framework
 * https://draftjs.org/
 */

import htmlToText from '../utils/html-to-text.js';

export function isDraft (element) {
   return element.querySelector('[data-contents]');
}

function insertDraftFragment (text) {
  var sel = window.getSelection();
  var range = sel.getRangeAt(0);
  range.deleteContents();
  var node = range.createContextualFragment(text);
  range.insertNode(node);

  // collapsing the range toEnd (with FALSE/default) throws Draft offset error:
  // The offset [] is larger than the node's length.
  // must collapse to the start.
  range.collapse(true);

  return node;
}

// ZERO-WIDTH whitespace
var WHITESPACE = '\u200b';

function insertDraftBlock (text) {
  insertDraftFragment(text);
  // whitespace trick is needed to move the selection after the inserted text.
  // see above why we can't collapse range toEnd.
  // selection will be placed before the whitespace, but AFTER the template.
  // without the whitespace, the selection is apparently in the correct spot,
  // but after typing the first character, it jumps to the content start.
  // when we insert the template in-between text, it works as expected,
  // without the whitespace trick.
  insertDraftFragment(WHITESPACE);

  // update draft state
  document.activeElement.dispatchEvent(new Event('input', {bubbles: true}));
}

export function insertDraftTemplate (params = {}) {
  const selection = window.getSelection()
  const range = selection.getRangeAt(0)
  const focusNode = selection.focusNode

  // TODO completely breaks draft.js when inserted from the dialog
  // delete shortcut
  if (params.word.text === params.quicktext.shortcut) {
    range.setStart(focusNode, params.word.start)
    range.setEnd(focusNode, params.word.end)
    range.deleteContents()
  }

  // draft only supports plain text
  const content = htmlToText(params.text)

  return insertDraftBlock(content)
}
