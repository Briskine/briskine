/* global Mousetrap */
import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'

import styles from './dialog.css?raw'

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'

const dialogVisibleAttr = 'visible'
const dialogMaxHeight = 250

const bubbleTagName = 'b-bubble'

function defineDialog () {
  customElements.define(
    'b-dialog',
    class extends HTMLElement {
      constructor () {
        super()

        this.show = (e) => {
          // TODO show only if in an editable element, or from the bubble
          let target
          if (isEditable(e.target)) {
            // TODO get caret position
            target = getCaretNode(e.target)
            console.log('is editable', target)
          } else if (e.target.tagName.toLowerCase() === bubbleTagName) {
            target = e.target
          } else {
            return
          }

          console.log('got show', e)
          console.log(window.getSelection().focusNode)
          console.log(e.target.tagName)

          // must be set visible before positioning,
          // so we can get its dimensions.
          this.setAttribute(dialogVisibleAttr, true)

          const position = getDialogPosition(target, this)
          this.style.top = `${position.top}px`
          this.style.left = `${position.left}px`
        }

        this.hide = (e) => {
          // TODO keep the bubble visible if we showed the dialog from it
          // and haven't hidden it
          if (this.contains(e.target)) {
            return
          }

          this.removeAttribute(dialogVisibleAttr)
        }
      }
      connectedCallback () {
        if (!this.isConnected) {
          return
        }

        const shadowRoot = this.attachShadow({mode: 'open'})
        shadowRoot.innerHTML = `
          <style>${styles}</style>
          <div>dialog</div>
        `

        document.addEventListener(dialogShowEvent, this.show)
        document.addEventListener('click', this.hide)

        const shortcut = this.getAttribute('shortcut')
        if (shortcut) {
          Mousetrap.bindGlobal(shortcut, this.show)
        }

        // TODO set up shortcuts and functionality
        // TODO instead of dialog_limit, use infinite loading with intersection observer
      }
      disconnectedCallback () {
        console.log('disconnectedCallback')

        document.removeEventListener(dialogShowEvent, this.show)
        document.removeEventListener('click', this.hide)

        // TODO remove key bindings
      }
    }
  )
}

function isEditable (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase()) || isContentEditable(element)
}

function getDialogPosition (targetNode, instance) {
  const pageHeight = window.innerHeight
  const scrollTop = window.scrollY
  const scrollLeft = window.scrollX

  const dialogMetrics = instance.getBoundingClientRect()

  // in case we want to position the dialog next to
  // another element,
  // not next to the cursor.
  // eg. when we position it next to the qa button.
  const targetMetrics = targetNode.getBoundingClientRect()

  console.log(targetMetrics)

  // because we use getBoundingClientRect
  // we need to add the scroll position
  let topPos = targetMetrics.top + targetMetrics.height + scrollTop
  // TODO add RTL support
//   let leftPos = targetMetrics.left + targetMetrics.width + scrollLeft - dialogMetrics.width
  let leftPos = targetMetrics.left + scrollLeft

  // if targetNode is range
  if (targetNode instanceof Range) {
    leftPos = leftPos + targetMetrics.width
  }

  // check if we have enough space at the bottom
  // for the maximum dialog height
  const bottomSpace = pageHeight - topPos - scrollTop
  if (bottomSpace < dialogMaxHeight) {
    topPos = topPos - dialogMetrics.height - targetMetrics.height
  }

  return {
    top: topPos,
    left: leftPos
  }
}

function getCaretNode (element) {
    var position = {
        element: element || null,
        offset: 0,
        absolute: {
            left: 0,
            top: 0
        },
        word: null
    };

    var $caret;

    var getRanges = function (sel) {
        if (sel.rangeCount) {
            var ranges = [];
            for (var i = 0; i < sel.rangeCount; i++) {
                ranges.push(sel.getRangeAt(i));
            }
            return ranges;
        }
        return [];
    };

    var restoreRanges = function (sel, ranges) {
        for (var i in ranges) {
            sel.addRange(ranges[i]);
        }
    };

    if (isContentEditable(element)) {
      const selection = window.getSelection()
      if (selection.rangeCount !== 0) {
        const range = selection.getRangeAt(0)
        // TODO
        // https://github.com/w3c/csswg-drafts/issues/2514
        if (range.collapsed === true && range.endContainer.nodeType === Node.ELEMENT_NODE) {
          return range.endContainer
        }
        return range
      }

//         // Working with editable div
//         // Insert a virtual cursor, find its position
//         // http://stackoverflow.com/questions/16580841/insert-text-at-caret-in-contenteditable-div
//
//         var selection = doc.getSelection();
//         // get the element that we are focused + plus the offset
//         // Read more about this here: https://developer.mozilla.org/en-US/docs/Web/API/Selection.focusNode
//         position.element = selection.focusNode;
//         position.offset = selection.focusOffset;
//
//         // First we get all ranges (most likely just 1 range)
//         var ranges = getRanges(selection);
//         var focusNode = selection.focusNode;
//         var focusOffset = selection.focusOffset;
//
//         if (!ranges.length) {
//             return;
//         }
//         // remove any previous ranges
//         selection.removeAllRanges();
//
//         // Added a new range to place the caret at the focus point of the cursor
//         var range = new Range();
//         var caretText = '<span id="qt-caret"></span>';
//         range.setStart(focusNode, focusOffset);
//         range.setEnd(focusNode, focusOffset);
//         range.insertNode(range.createContextualFragment(caretText));
//         selection.addRange(range);
//         selection.removeAllRanges();
//
//         // finally we restore all the ranges that we had before
//         restoreRanges(selection, ranges);
//
//         // Virtual caret
//         $caret = $('#qt-caret');
//
//         if ($caret.length) {
//
//             position.absolute = $caret.offset();
//             position.absolute.width = $caret.width();
//             position.absolute.height = $caret.height();
//
//             // Remove virtual caret
//             $caret.remove();
//         }

    } else {

        // Working with textarea
        // Create a mirror element, copy textarea styles
        // Insert text until selectionEnd
        // Insert a virtual cursor and find its position

        position.start = position.element.selectionStart;
        position.end = position.element.selectionEnd;

        var $mirror = $('<div id="qt-mirror" class="qt-mirror"></div>').addClass(position.element.className),
            $source = $(position.element),
            $sourcePosition = $source.offset();

        // copy all styles
        for (var i in autocomplete.mirrorStyles) {
            var style = autocomplete.mirrorStyles[i];
            $mirror.css(style, $source.css(style));
        }

        var sourceMetrics = $source.get(0).getBoundingClientRect();

        // set absolute position
        $mirror.css({
            top: $sourcePosition.top + 'px',
            left: $sourcePosition.left + 'px',
            width: sourceMetrics.width,
            height: sourceMetrics.height
        });

        // copy content
        $mirror.html($source.val().substr(0, position.end).split("\n").join('<br>'));
        $mirror.append('<span id="qt-caret" class="qt-caret"></span>');

        // insert mirror
        $('body').append($mirror);

        $caret = $('#qt-caret', $mirror);

        position.absolute = $caret.offset();
        position.absolute.width = $caret.width();
        position.absolute.height = $caret.height();

        $mirror.remove();

    }

    return element
};

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  // dialog is defined later,
  // to avoid errors with other existing intances on page,
  // when reloading the bubble without page refresh.
  // (connectedCallback is triggered when re-defining an existing element)
  defineDialog()

  dialogInstance = document.createElement('b-dialog')
  dialogInstance.setAttribute('shortcut', settings.dialog_shortcut)
  document.documentElement.appendChild(dialogInstance)
}

export function destroy () {
  if (!dialogInstance) {
    return
  }

  dialogInstance.remove()
}

