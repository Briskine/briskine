/* Draft.js rich text editor framework
 * https://draftjs.org/
 */

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

export function insertDraftText (params = {}) {
    params.element.focus();

    // delete shortcut
    if (params.word.text === params.quicktext.shortcut) {
        var range = window.getSelection().getRangeAt(0);
        range.setStart(params.focusNode, params.word.start);
        range.setEnd(params.focusNode, params.word.end);
        range.deleteContents();
    }

    return insertDraftBlock(params.text);
}
