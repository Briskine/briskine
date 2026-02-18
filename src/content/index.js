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

import { setup as setupKeyboard, destroy as destroyKeyboard } from './keyboard.js'
import { setup as setupCursors, destroy as destroyCursors } from './cursors/cursors.js'
import { setup as setupBubble, destroy as destroyBubble } from './bubble/bubble.js'
import { setup as setupStatus, destroy as destroyStatus } from './status.js'
import { setup as setupDialog, destroy as destroyDialog } from './dialog/dialog.js'
import { setup as setupPage } from './page/page-parent.js'
import { setup as setupAttachments, destroy as destroyAttachments } from './attachments/attachments.js'
import {
  setup as setupDashboardEvents,
  destroy as destroyDashboardEvents
} from './dashboard-events-client.js'
import { setup as setupInsertEvent, destroy as destroyInsertEvent } from './insert-template-event.js'
import {
  setup as setupActiveElement,
  destroy as destroyActiveElement,
} from './utils/active-element.js'
import { destroy as destroySandbox} from './sandbox/sandbox-parent.js'
import { destroy as destroyKeybind } from './keybind.js'
import getEventTarget from './utils/event-target.js'
import { isTextfieldEditor } from './editors/editor-textfield.js'
import { isContentEditable } from './editors/editor-contenteditable.js'
import { addFocusListeners } from './utils/shadow-focus.js'

import debug from '../debug.js'

const readyMessage = 'briskine-ready'
let removeFocusListeners = () => {}

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

  const components = await Promise.allSettled([
    setupStore(),
    setupKeyboard(settings),
    setupCursors(),
    setupBubble(settings),
    setupDialog(settings),
    setupPage(),
    setupAttachments(),
    setupInsertEvent(),
    setupActiveElement(),
  ])

  components.forEach((c) => {
    if (c.status === 'rejected') {
      debug(['component', c, c.reason], 'error')
    }
  })

  // update the content components if settings change
  settingsCache = {...settings}
  storeOn('users-updated', usersUpdated)

  window.postMessage(readyMessage)
}

function initOnFocus (e) {
  const target = getEventTarget(e)
  if (isTextfieldEditor(target) || isContentEditable(target)) {
    removeFocusListeners()
    init()
  }
}

let startupRetries = 0
const startupDelay = 500
const maxStartupRetries = 10
const loadedProp = '__briskineLoaded'

async function startup () {
  startupRetries = startupRetries + 1
  if (startupRetries > maxStartupRetries) {
    return
  }

  // try again later if we don't have a body yet,
  // for dynamically created iframes.
  if (!document.body) {
    return setTimeout(startup, startupDelay)
  }

  // use a custom property on the body,
  // to detect if the body was recreated (eg. in dynamically created iframes).
  document.body[loadedProp] = true

  setupStatus()
  setupDashboardEvents()

  removeFocusListeners = addFocusListeners(initOnFocus, 'focusin')

  setTimeout(() => {
    // if the document was recreated (e.g., ckeditor4 dynamically crated iframe),
    // we'll retry initializing.
    if (!document.body[loadedProp]) {
      return startup()
    }

    // cleanup
    delete document.body[loadedProp]
    // reset retries
    startupRetries = 0
  }, startupDelay)
}

function destructor () {
  destroyStatus()
  destroyDashboardEvents()

  storeOff('users-updated', usersUpdated)

  destroyStore()
  destroyKeyboard()
  destroyCursors()
  destroyBubble()
  destroyDialog()
  destroyAttachments()
  destroyInsertEvent()
  destroyActiveElement()

  destroyKeybind()
  destroySandbox()

  removeFocusListeners()
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
