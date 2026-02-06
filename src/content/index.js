// native custom elements are not supported in content scripts
// https://bugs.chromium.org/p/chromium/issues/detail?id=390807
import '@webcomponents/custom-elements'
import isEqual from 'lodash.isequal'

import {
  getSettings,
  on as storeOn,
  off as storeOff,
  destroy as destroyStore,
  setup as setupStore,
} from '../store/store-content.js'
import { eventDestroy } from '../config.js'
import {isBlocklisted} from '../blocklist.js'

import {setup as setupKeyboard, destroy as destroyKeyboard} from './keyboard.js'
import {setup as setupBubble, destroy as destroyBubble} from './bubble/bubble.js'
import {setup as setupStatus, destroy as destroyStatus} from './status.js'
import {setup as setupDialog, destroy as destroyDialog} from './dialog/dialog.js'
import {destroy as destroySandbox} from './sandbox/sandbox-parent.js'
import {setup as setupPage, destroy as destroyPage} from './page/page-parent.js'
import {setup as setupAttachments, destroy as destroyAttachments} from './attachments/attachments.js'
import {setup as setupDashboardEvents, destroy as destroyDashboardEvents} from './dashboard-events-client.js'
import {setup as setupInsertEvent, destroy as destroyInsertEvent} from './insert-template-event.js'
import getEventTarget from './utils/event-target.js'
import { isTextfieldEditor } from './editors/editor-textfield.js'
import { isContentEditable } from './editors/editor-contenteditable.js'

const readyMessage = 'briskine-ready'

function getParentUrl () {
  let url = window.location.href
  if (window !== window.parent) {
    try {
      url = window.parent.location.href
    } catch {
      // iframe from different domain
    }
  }

  return url
}

async function init () {
  const settings = await getSettings()

  if (isBlocklisted(settings, getParentUrl())) {
    return false
  }

  await Promise.allSettled([
    setupStore(),
    setupKeyboard(settings),
    setupBubble(settings),
    setupDialog(settings),
    setupPage(),
    setupAttachments(),
    setupInsertEvent(),
  ])

  // update the content components if settings change
  settingsCache = {...settings}
  storeOn('users-updated', usersUpdated)

  window.postMessage(readyMessage)
}

function initOnFocus (e) {
  const target = getEventTarget(e)
  if (isTextfieldEditor(target) || isContentEditable(target)) {
    init()
    document.removeEventListener('focusin', initOnFocus, true)
  }
}

async function startup () {
  setupStatus()
  setupDashboardEvents()

  document.addEventListener('focusin', initOnFocus, true)
  return
}

function destructor () {
  destroyStatus()
  destroyDashboardEvents()

  storeOff('users-updated', usersUpdated)

  destroyStore()
  destroyKeyboard()
  destroyBubble()
  destroyDialog()
  destroyPage()
  destroyAttachments()
  destroyInsertEvent()

  destroySandbox()

  document.removeEventListener('focusin', initOnFocus, true)
  settingsCache = {}
}

// destroy existing content script
document.dispatchEvent(new CustomEvent(eventDestroy))

document.addEventListener(eventDestroy, destructor, {once: true})

let settingsCache = {}
async function usersUpdated () {
  // run only if we already have settings cached,
  // when content components were initialized.
  if (!Object.keys(settingsCache).length) {
    return
  }

  // restart the content components if any of the settings changed
  const settings = await getSettings()
  const settingsChanged = !isEqual(settings, settingsCache)
  if (settingsChanged) {
    destructor()
    startup()
  }
}

startup()
