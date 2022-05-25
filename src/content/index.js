// native custom elements are not supported in content scripts
// https://bugs.chromium.org/p/chromium/issues/detail?id=390807
import '@webcomponents/custom-elements'
import browser from 'webextension-polyfill'
// creates global window.Mousetrap
import Mousetrap from 'mousetrap'
import 'mousetrap/plugins/global-bind/mousetrap-global-bind.js'

import './helpers/content-helpers.js'

import store from '../store/store-client.js'
import {keyboardAutocomplete} from './keyboard.js'
import config from '../config.js'

import {isContentEditable} from './editors/editor-contenteditable.js'
import {setup as setupBubble, destroy as destroyBubble} from './bubble/bubble.js'
import {setup as setupStatus, destroy as destroyStatus} from './status.js'
import {setup as setupDialog, destroy as destroyDialog} from './dialog/dialog.js'

function init (settings) {
  if (!document.body) {
    return;
  }

  var currentUrl = window.location.href;

  var blacklistPrivate = [];

  // create the full blacklist
  // from the editable and private one
  var fullBlacklist = [];
  [].push.apply(fullBlacklist, settings.blacklist);
  [].push.apply(fullBlacklist, blacklistPrivate);

  // check if url is in blacklist
  var isBlacklisted = false;
  fullBlacklist.some(function(item) {
      if (item && currentUrl.indexOf(item) !== -1) {
          isBlacklisted = true;
          return true;
      }
      return false;
  });

  if (isBlacklisted) {
      return false;
  }

  // use custom keyboard shortcuts
  if (settings.expand_enabled) {
      Mousetrap.bindGlobal(
          settings.expand_shortcut,
          keyboardAutocomplete
      );
  }

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
  if (document.contentType !== 'text/html') {
    // don't load on non html pages (json, xml, etc..)
    return
  }

  store.getSettings().then((settings) => {
    init(settings, window.document)
  })
}

// destroy existing content script
const destroyEvent = new CustomEvent(config.destroyEvent)
document.dispatchEvent(destroyEvent)

function destructor () {
  // unbind keyboard shortcuts
  Mousetrap.reset()

  // destroy bubble
  destroyBubble()

  // destroy dialog
  destroyDialog()

  // destroy status event
  destroyStatus()
}

document.addEventListener(config.destroyEvent, destructor, {once: true})

startup()
