// native custom elements are not supported in content scripts
// https://bugs.chromium.org/p/chromium/issues/detail?id=390807
import '@webcomponents/custom-elements'
import deepEqual from 'deep-equal'

// import store from '../store/store-client.js'
import store from '../store/store-content.js'
import config from '../config.js'

import {setup as setupKeyboard, destroy as destroyKeyboard} from './keyboard.js'
import {setup as setupBubble, destroy as destroyBubble} from './bubble/bubble.js'
import {setup as setupStatus, destroy as destroyStatus} from './status.js'
import {setup as setupDialog, destroy as destroyDialog} from './dialog/dialog.js'
import {destroy as destroySandbox} from './sandbox/sandbox-parent.js'
import {setup as setupPage, destroy as destroyPage} from './page/page-parent.js'
import {setup as setupAttachments, destroy as destroyAttachments} from './attachments/attachments.js'
import {setup as setupDashboardEvents, destroy as destroyDashboardEvents} from './dashboard-events-client.js'


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

const currentUrl = getParentUrl()

const blacklistPrivate = [
  '.briskine.com',
]

function init (settings) {
  setupStatus()
  setupDashboardEvents()

  // create the full blacklist
  // from the editable and private one
  const fullBlacklist = blacklistPrivate.concat(settings.blacklist)

  // check if url is in blacklist
  const isBlacklisted = fullBlacklist.find((url) => {
      return url && currentUrl.includes(url)
    })

  if (isBlacklisted) {
    return false
  }

  store.setup()

  setupKeyboard(settings)
  setupBubble(settings)
  setupDialog(settings)

  setupPage()
  setupAttachments()

  // update the content components if settings change
  settingsCache = Object.assign({}, settings)
  store.on('users-updated', refreshContentScripts)

  return
}

let startupDelay = 500
let startupRetries = 0
const maxStartupRetries = 10
let destroyed = false

async function startup () {
  startupRetries = startupRetries + 1

  if (startupRetries > maxStartupRetries) {
    return
  }

  // don't load on non html pages (json, xml, etc..)
  if (document.contentType !== 'text/html') {
    return
  }

  // try again later if we don't have a body yet,
  // for dynamically created iframes.
  if (!document.body) {
    return setTimeout(startup, startupDelay)
  }

  // use a custom property on the body,
  // to detect if the body was recreated (eg. in dynamically created iframes).
  document.body._briskineLoaded = true

  const settings = await store.getSettings()
  // check if we were destroyed while waiting for settings, or startupDelay
  if (destroyed === false) {
    init(settings)

    setTimeout(() => {
      // if the body was recreated,
      // we'll retry initializing.
      if (!document.body._briskineLoaded) {
        startup()
      }
    }, startupDelay)
  }
}

function destructor () {
  destroyKeyboard()
  destroyBubble()
  destroyDialog()
  destroyStatus()
  destroySandbox()
  destroyPage()
  destroyAttachments()
  destroyDashboardEvents()

  settingsCache = {}
  store.off('users-updated', refreshContentScripts)
  store.destroy()
  destroyed = true
}

// destroy existing content script
const destroyEvent = new CustomEvent(config.destroyEvent)
document.dispatchEvent(destroyEvent)

document.addEventListener(config.destroyEvent, destructor, {once: true})

let settingsCache = {}
function refreshContentScripts () {
  // run only if we already have settings cached,
  // when content components were initialized.
  if (!Object.keys(settingsCache).length) {
    return
  }

  // restart the content components if any of the settings changed
  store.getSettings()
    .then((settings) => {
      const settingsChanged = !deepEqual(settings, settingsCache)
      if (settingsChanged) {
        destructor()
        init(settings)
      }
    })
}

startup()
