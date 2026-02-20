/**
 * Cursors
 */
import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'
import { getActiveElement } from '../utils/active-element.js'
import getEventTarget from '../utils/event-target.js'
import { getSelectionRange, setSelectionRange } from '../utils/selection.js'

const keyboardShortcut = 'tab'
export const cursorMarker = '\u200B'

function getAllCursors (text) {
  const regex = new RegExp(`${cursorMarker}.*?${cursorMarker}`, 'g')
  const cursors = []
  let match
  while ((match = regex.exec(text)) !== null) {
    cursors.push({
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return cursors
}

function getRangeOffsets (el, range) {
  const preSelectionRange = document.createRange()
  preSelectionRange.selectNodeContents(el)
  preSelectionRange.setEnd(range.startContainer, range.startOffset)
  const start = preSelectionRange.toString().length

  const contentRange = document.createRange()
  contentRange.setStart(range.startContainer, range.startOffset)
  contentRange.setEnd(range.endContainer, range.endOffset)
  const end = start + contentRange.toString().length

  return {
    start,
    end,
  }
}

function createRangeFromOffsets (el, start, end) {
  const range = document.createRange()
  let charCount = 0
  let startNode = null
  let startOffset = 0
  let endNode = null
  let endOffset = 0

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
  let node
  let foundStart = false

  while ((node = walker.nextNode()) !== null) {
    const nodeLen = node.textContent.length
    const nextCharCount = charCount + nodeLen

    if (
      !foundStart
      && start >= charCount
      && start <= nextCharCount
    ) {
      startNode = node
      startOffset = start - charCount
      foundStart = true
    }

    if (
      foundStart
      && end >= charCount
      && end <= nextCharCount
    ) {
      endNode = node
      endOffset = end - charCount
      break
    }

    charCount = nextCharCount
  }

  if (startNode && endNode) {
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    return range
  }

  return null
}

function getSelectionState (el) {
  if (isTextfieldEditor(el)) {
    return {
      start: el.selectionStart,
      end: el.selectionEnd,
    }
  }

  const range = getSelectionRange(el)
  if (!range) {
    return null
  }

  return getRangeOffsets(el, range)
}

// delete contents of range and preserve whitespace around it.
// when using range.deleteContents for empty cursors, regular whitespace around the cursor would be collapsed.
// replace regular whitespace around empty cursors with &nbsp;, to prevent them from collapsing,
// and have contenteditable act more like textarea (in regards to whitespace around cursors).
// after typing, the browser will convert the &nbsp;'s to regular whitespace chars.
const nbsp = '\u00A0'
function safeDeleteContents (range) {
  const node = range.startContainer
  const start = range.startOffset
  const end = range.endOffset
  const lengthToDelete = end - start

  if (
    node.nodeType !== Node.TEXT_NODE
    || node !== range.endContainer
  ) {
    range.deleteContents()
    return range
  }

  // in case the char before the cursor is space
  if (
    start > 0
    && node.textContent[start - 1] === ' '
  ) {
    // convert to &nbsp;
    node.replaceData(start - 1, 1, nbsp)
  }

  // in case the char after the cursor is space
  if (
    end < node.textContent.length
    && node.textContent[end] === ' '
  ) {
    node.replaceData(end, 1, nbsp)
  }

  node.deleteData(start, lengthToDelete)
  range.collapse()
  return range
}

function setSelectionState (el, start, end) {
  // empty cursors (marker+marker) will be removed on first selection/focus
  const isEmpty = (end - start === 2)

  if (isTextfieldEditor(el)) {
    el.setSelectionRange(start, end)
    if (isEmpty) {
      // remove cursor if empty
      el.setRangeText('')
    }

    return
  }

  const range = createRangeFromOffsets(el, start, end)

  if (range) {
    if (
      isEmpty
      // BUG WORKAROUND
      // don't delete empty cursors on ckeditor5.
      // ckeditor5 prevents direct dom manipulation, even from the range api.
      // when using range.deleteContents, empty cursors are not removed,
      // and the caret doesn't move.
      // not using range.deleteContents keeps the correct range selected,
      // so we can start typing to remove the cursor, **but the caret is invisible**.
      // the alternative would be to not support empty cursors on ckeditor5.
      && !el?.matches?.('.ck-editor__editable')
    ) {
      safeDeleteContents(range)
    }

    return setSelectionRange(el, range)
  }
}

function getNextCursor (cursors, currentStart, currentEnd, isShiftKey) {
  if (isShiftKey) {
    return cursors.slice().reverse().find(s => s.start < currentStart)
  }

  const isSelectingCursor = cursors.some(s => s.start === currentStart && s.end === currentEnd)
  if (isSelectingCursor) {
    return cursors.find(s => s.start > currentStart)
  }

  return cursors.find(s => s.start >= currentStart)
}

function selectCursor (e) {
  if (e?.key?.toLowerCase?.() !== keyboardShortcut) {
    return
  }

  const el = getEventTarget(e)
  if (!isTextfieldEditor(el) && !isContentEditable(el)) {
    return
  }

  const state = getSelectionState(el)
  if (!state) {
    return
  }

  const text = isTextfieldEditor(el) ? el.value : el.textContent
  const cursors = getAllCursors(text)
  if (!cursors.length) {
    return
  }

  const target = getNextCursor(cursors, state.start, state.end, e.shiftKey)
  if (target) {
    e.preventDefault()
    e.stopPropagation()

    setSelectionState(el, target.start, target.end)
  }
}

export function selectFirstCursor ({ text }) {
  const el = getActiveElement()
  const state = getSelectionState(el)
  if (!state) {
    return
  }

  const cursorsInTemplate = getAllCursors(text)
  if (!cursorsInTemplate.length) {
    return
  }

  const elementText = isTextfieldEditor(el) ? el.value : el.textContent
  const cursors = getAllCursors(elementText)
  if (!cursors.length) {
    return
  }

  // the html in the editor will not match the template html when using
  // third-party editors.
  // find the index of the first cursor in the template, from the complete list
  // of cursors in the entire editor.
  const cursorsBeforeCaret = cursors.filter(c => c.end <= state.start)
  const targetIndex = cursorsBeforeCaret.length - cursorsInTemplate.length
  const firstCursorInTemplate = cursorsBeforeCaret[targetIndex]

  if (firstCursorInTemplate) {
    return setSelectionState(el, firstCursorInTemplate.start, firstCursorInTemplate.end)
  }
}

export function setup () {
  window.addEventListener('keydown', selectCursor, true)
}

export function destroy () {
  window.removeEventListener('keydown', selectCursor, true)
}
