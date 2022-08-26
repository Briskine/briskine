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
}

const startupDelayList = [
  // salesforce needs a delay when initializing,
  // because it rewrites the ckeditor iframe after it loads, with document.write/open,
  // and causes all of our event listeners to be removed.
  '.force.com',
]

let startupDelay = 0
let startupRetries = 0
if (startupDelayList.find((url) => currentUrl.includes(url))) {
  startupDelay = 500
}

function startup () {
  // don't load on non html pages (json, xml, etc..)
  if (document.contentType !== 'text/html') {
    return
  }

  // some editors load the entire contenteditable in a separate iframe (eg. ckeditor 4),
  // so we need to wait for the body to be available.
  if (document.body) {
    if (startupDelay) {
      setTimeout(() => {
        store.getSettings().then(init)
      }, startupDelay)
    } else {
      store.getSettings().then(init)
    }
  } else if (startupRetries < 5) {
    startupDelay = 500
    startupRetries = startupRetries + 1
    setTimeout(startup, startupDelay)
  }
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
}

document.addEventListener(config.destroyEvent, destructor, {once: true})

startup()
