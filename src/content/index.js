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

const blacklistPrivate = [
  '.briskine.com',
]

function init (settings) {
  setupStatus()

  // create the full blacklist
  // from the editable and private one
  const fullBlacklist = blacklistPrivate.concat(settings.blacklist)

  // check if url is in blacklist
  const currentUrl = window.location.href
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

function startup () {
  if (document.contentType !== 'text/html' || !document.body) {
    // don't load on non html pages (json, xml, etc..)
    return
  }

  store.getSettings().then((settings) => {
    init(settings)
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
}

document.addEventListener(config.destroyEvent, destructor, {once: true})

startup()
