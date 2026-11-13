/*
 * Template dialog, in the frame of the editor.
 *
 * Finds where to show the dialog, and shows it in the top frame,
 * even when the editor is in an iframe.
 */

import { eventShowDialog, eventDialogShow, eventDialogClose, eventDialogVisibility, frameRelayRequest } from '../../config.js'
import { on, off, trigger, createRequest } from '../../store/store-content.js'
import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'
import { getEditableCaret, getContentEditableCaret, getTargetRect } from './dialog-position.js'
import autocomplete from '../autocomplete.js'
import { saveSelection, restoreSelection } from '../utils/restore-selection.js'
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
let cachedSelection = null
// a show request is waiting for the top frame
let showing = false

// where the dialog opens, below an anchor in the target's rect.
// start and end follow the direction of the dialog.
function getTarget (node, rtl = false) {
  // the caret, with the dialog starting after it
  const caretAnchor = (rect) => ({
    ...rect,
    left: rtl ? rect.left : rect.left + rect.width,
    width: 0,
  })

  if (isTextfieldEditor(node)) {
    // input, textarea
    const [target, removeCaretParent] = getEditableCaret(node)
    return {
      target,
      removeCaretParent,
      anchor: caretAnchor,
      placement: 'bottom-start',
    }
  }

  if (isContentEditable(node)) {
    const target = getContentEditableCaret(node)
    if (target instanceof Range) {
      return {
        target,
        anchor: caretAnchor,
        placement: 'bottom-start',
      }
    }

    // the caret is in an empty element, at its top start corner
    return {
      target,
      anchor: (rect) => ({
        top: rect.top,
        left: rtl ? rect.left + rect.width : rect.left,
        width: 0,
        height: 0,
      }),
      placement: 'bottom-start',
    }
  }

  // when the dialog is opened from the bubble button,
  // open it toward the inside of the textfield.
  if (isBubbleElement(node)) {
    return {
      target: node,
      anchor: (rect) => rect,
      placement: 'bottom-end',
    }
  }

  return null
}

// asks the top frame to show the dialog, next to the target
async function requestShow (target, direction) {
  let targetRect
  try {
    targetRect = getTargetRect(target.target)
  } finally {
    // clean-up the virtual caret mirror, used on input and textarea
    target.removeCaretParent?.()
  }

  let rect = null
  if (targetRect) {
    const offset = await getFrameOffset()
    const anchor = target.anchor(targetRect)
    rect = offset ? {
      ...anchor,
      top: anchor.top + offset.top,
      left: anchor.left + offset.left,
    } : null
  }

  return relay({
    event: eventDialogShow,
    details: {
      rect,
      placement: target.placement,
      direction,
      keyboardShortcut: settingsCache.dialog_shortcut,
    },
    frameId: topFrameId,
  })
}

// node is defined only when opened from the bubble
async function show ({ target: node } = {}) {
  if (showing) {
    return
  }

  node ??= getActiveElement()
  if (!node) {
    return
  }

  const direction = window.getComputedStyle(node).direction || 'ltr'
  const target = getTarget(node, direction === 'rtl')
  if (!target) {
    return
  }

  showing = true
  editor = getActiveElement()
  cachedSelection = saveSelection(editor)
  // before focus moves to the dialog
  trigger(eventDialogVisibility, {visible: true})

  let shown = false
  try {
    shown = await requestShow(target, direction)
  } catch (err) {
    debug(['dialog show', err], 'error')
  } finally {
    showing = false
  }

  if (shown !== true) {
    trigger(eventDialogVisibility, {visible: false})
  }
}

async function respondToClose ({ template } = {}) {
  let restored = false
  try {
    if (editor?.isConnected) {
      await restoreSelection(editor, cachedSelection)
      restored = true
    }
  } catch (err) {
    debug(['dialog restore selection', err], 'error')
  }

  trigger(eventDialogVisibility, {visible: false})

  if (restored && template) {
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
  cachedSelection = null
  showing = false
}
