// native custom elements are not supported in content scripts
// https://bugs.chromium.org/p/chromium/issues/detail?id=390807
import '@webcomponents/custom-elements'
import browser from 'webextension-polyfill'
// creates global window.Mousetrap
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

import './helpers/content-helpers.js'

import store from '../store/store-client.js'
import config from '../config.js'

import {isContentEditable} from './editors/editor-contenteditable.js'
import {setup as setupKeyboard, destroy as destroyKeyboard} from './keyboard.js'
import {setup as setupBubble, destroy as destroyBubble} from './bubble/bubble.js'
import {setup as setupStatus, destroy as destroyStatus} from './status.js'
import {setup as setupDialog, destroy as destroyDialog} from './dialog/dialog.js'

const blacklistPrivate = []

function init (settings) {
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

  // don't create the dialog inside editor iframes (eg. tinymce iframe)
  if (!isContentEditable(document.body)) {
    setupBubble(settings)
    setupDialog(settings)
  }

  injectPage()

  setupStatus()
}

// inject page script
function injectPage () {
  const page = document.createElement('script')
  page.src = browser.runtime.getURL('page/page.js')
  page.onload = function () {
    this.remove()
  }
  document.documentElement.appendChild(page)
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
  // unbind keyboard shortcuts
  Mousetrap.reset()

  // destroy keyboard autocomplete
  destroyKeyboard()

  // destroy bubble
  destroyBubble()

  // destroy dialog
  destroyDialog()

  // destroy status event
  destroyStatus()
}

document.addEventListener(config.destroyEvent, destructor, {once: true})

startup()
