/**
 * Cursors
 */
import { isContentEditable } from './editors/editor-contenteditable.js'
import { isTextfieldEditor } from './editors/editor-textfield.js'
import getEventTarget from './utils/event-target.js'
import { getSelectionRange, setSelectionRange } from './utils/selection.js'

const keyboardShortcut = 'tab'
export const cursorMarker = '\u200B'

function getAllCursors (el) {
  const text = isTextfieldEditor(el) ? el.value : el.textContent
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

    if (!foundStart && start >= charCount && start <= nextCharCount) {
      startNode = node
      startOffset = start - charCount
      foundStart = true
    }

    if (foundStart && end >= charCount && end <= nextCharCount) {
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
    if (isEmpty) {
      range.deleteContents()
    }

    return setSelectionRange(el, range)
  }
}

function getNextCursor (cursors, currentStart, currentEnd, isShiftKey) {
  const isSelectingCursor = cursors.some(s => s.start === currentStart && s.end === currentEnd)

  if (isShiftKey) {
    return cursors.slice().reverse().find(s => s.start < currentStart)
  }

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

  const cursors = getAllCursors(el)
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

export async function selectFirstCursor (el) {
  const cursors = getAllCursors(el)
  if (!cursors.length) {
    return
  }

  const firstCursor = cursors[0]
  return setSelectionState(el, firstCursor.start, firstCursor.end)
}

export function setup () {
  document.addEventListener('keydown', selectCursor, true)
}

export function destroy () {
  document.removeEventListener('keydown', selectCursor, true)
}
