// native custom elements are not supported in content scripts
// https://bugs.chromium.org/p/chromium/issues/detail?id=390807
import '@webcomponents/custom-elements'

import store from '../store/store-client.js'
import config from '../config.js'

import {setup as setupKeyboard, destroy as destroyKeyboard} from './keyboard.js'
import {setup as setupBubble, destroy as destroyBubble} from './bubble/bubble.js'
import {setup as setupStatus, destroy as destroyStatus} from './status.js'
import {setup as setupDialog, destroy as destroyDialog} from './dialog/dialog.js'
import {setup as setupSandbox, destroy as destroySandbox} from './sandbox/sandbox-parent.js'
import {setup as setupPage, destroy as destroyPage} from './page/page-parent.js'

const currentUrl = window.location.href

const blacklistPrivate = [
  '.briskine.com',
]

function init (settings) {
  setupStatus()

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

  setupKeyboard(settings)
  setupBubble(settings)
  setupDialog(settings)

  setupSandbox()
  setupPage()

  // update the content components if settings change
  settingsCache = Object.assign({}, settings)
  store.on('users-updated', refreshContentScripts)

  return
}

let startupDelay = 500
let startupRetries = 0
const maxStartupRetries = 10

function startup () {
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
  // to detect if the body was rewrote (eg. in dynamically created iframes).
  document.body._briskineLoaded = true

  return store.getSettings()
    .then((settings) => {
      init(settings)
      return
    })
    .then(() => {
      setTimeout(() => {
        // if the body was rewrote,
        // we'll retry initializing.
        if (!document.body._briskineLoaded) {
          startup()
        }
      }, startupDelay)
    })
}

// destroy existing content script
const destroyEvent = new CustomEvent(config.destroyEvent)
document.dispatchEvent(destroyEvent)

function destructor () {
  destroyKeyboard()
  destroyBubble()
  destroyDialog()
  destroyStatus()
  destroySandbox()
  destroyPage()

  settingsCache = {}
  store.off('users-updated', refreshContentScripts)
}

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
      const settingsChanged = JSON.stringify(settings) !== JSON.stringify(settingsCache)
      if (settingsChanged) {
        destructor()
        init(settings)
      }
    })
}

startup()
