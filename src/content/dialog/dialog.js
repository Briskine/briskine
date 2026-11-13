/*
 * Template dialog, in the frame of the editor.
 *
 * Finds where to show the dialog, and shows it in the top frame,
 * even when the editor is in an iframe.
 */

import { eventShowDialog, eventDialogShow, eventDialogClose, frameRelayRequest } from '../../config.js'
import { on, off, createRequest } from '../../store/store-content.js'
import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'
import { getEditableCaret, getContentEditableCaret, getTargetRect } from './dialog-position.js'
import autocomplete from '../autocomplete.js'
import { getSelectionRange } from '../utils/selection.js'
import restoreSelection from '../utils/restore-selection.js'
import { getActiveElement } from '../utils/active-element.js'
import { isBubbleElement } from '../utils/extension-element.js'
import getFrameOffset from '../utils/frame-offset.js'
import { keybind, keyunbind } from '../keybind.js'
import debug from '../../debug.js'

const relay = createRequest(frameRelayRequest)
const topFrameId = 0

let settingsCache = {}

// the editor the dialog was opened for,
// to restore its selection and insert templates.
let editor = null
let cachedRange = null

// the placement of the dialog, relative to the target
function getTarget (node) {
  const direction = window.getComputedStyle(node).direction || 'ltr'

  if (isTextfieldEditor(node)) {
    // input, textarea
    const [target, removeCaretParent] = getEditableCaret(node)
    return {
      target,
      removeCaretParent,
      direction,
      placement: direction === 'rtl' ? 'bottom-left-flip' : 'bottom-right',
    }
  }

  if (isContentEditable(node)) {
    const target = getContentEditableCaret(node)
    // only use the targetMetrics width when caret is a range.
    // workaround for when the contenteditable caret is the endContainer.
    const isRange = target instanceof Range

    let placement = 'top-left'
    if (direction === 'rtl') {
      placement = isRange ? 'bottom-left-flip' : 'top-right-flip'
    } else if (isRange) {
      placement = 'bottom-right'
    }

    return {
      target,
      direction,
      placement,
    }
  }

  // when the dialog is opened from the bubble button
  if (isBubbleElement(node)) {
    return {
      target: node,
      direction,
      placement: direction === 'rtl' ? 'bottom-left' : 'bottom-right-flip',
    }
  }

  return null
}

// node is defined only when opened from the bubble
async function show ({ target: node } = {}) {
  node ??= getActiveElement()
  if (!node) {
    return
  }

  const target = getTarget(node)
  if (!target) {
    return
  }

  editor = getActiveElement()
  cachedRange = getSelectionRange(editor)
  let rect = getTargetRect(target.target)
  // clean-up the virtual caret mirror, used on input and textarea
  target.removeCaretParent?.()

  if (rect) {
    const offset = await getFrameOffset()
    rect = offset ? {
      ...rect,
      top: rect.top + offset.top,
      left: rect.left + offset.left,
    } : null
  }

  try {
    await relay({
      event: eventDialogShow,
      details: {
        rect,
        placement: target.placement,
        direction: target.direction,
        keyboardShortcut: settingsCache.dialog_shortcut,
      },
      frameId: topFrameId,
    })
  } catch (err) {
    debug(['dialog show', err], 'error')
  }
}

async function respondToClose ({ template } = {}) {
  if (!editor?.isConnected) {
    return
  }

  await restoreSelection(editor, cachedRange)

  if (template) {
    autocomplete({
      template: template,
    })
  }
}

function keyboardShow (e) {
  // prevent capturing keystrokes by the parent
  e.stopPropagation()
  e.preventDefault()

  show()
}

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  settingsCache = settings
  keybind(settingsCache.dialog_shortcut, keyboardShow)
  on(eventShowDialog, show)
  on(eventDialogClose, respondToClose)
}

export function destroy () {
  keyunbind(settingsCache.dialog_shortcut, keyboardShow)
  off(eventShowDialog, show)
  off(eventDialogClose, respondToClose)

  editor = null
  cachedRange = null
}
