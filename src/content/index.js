// native custom elements are not supported in content scripts
// https://bugs.chromium.org/p/chromium/issues/detail?id=390807
import '@webcomponents/custom-elements';
import browser from 'webextension-polyfill'
// creates global window.Mousetrap
import Mousetrap from 'mousetrap';
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import './content.css';

import './helpers/content-helpers';

import store from '../store/store-client';
import keyboard from './keyboard';
import dialog from './dialog';

import {setup as setupBubble, destroy as destroyBubble} from './bubble';

function init (settings, doc) {
  const loadedClassName = 'gorgias-loaded'

//   if (!document.body || document.body.classList.contains(loadedClassName)) {
  if (!document.body) {
    return;
  }
  // mark the doc that extension has been loaded
  document.body.classList.add(loadedClassName);

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
          keyboard.completion
      );
  }

  var isContentEditable = (window.document.body.contentEditable === 'true');
  if (
      settings.dialog_enabled &&
      // don't create the dialog inside editor iframes (eg. tinymce iframe)
      !isContentEditable
  ) {
      setupBubble();
      if (settings.dialog_limit) {
          dialog.RESULTS_LIMIT = settings.dialog_limit;
      }
      Mousetrap.bindGlobal(
          settings.dialog_shortcut,
          dialog.completion
      );

      // create dialog once and then reuse the same element
      dialog.create();
      dialog.bindKeyboardEvents(doc);
  }
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startup)
} else {
  startup()
}

const destroyEventName = 'briskine-destroy'
const destroyEvent = new CustomEvent(destroyEventName)

document.dispatchEvent(destroyEvent)

function destructor () {
  console.log('destroy')
  destroyBubble()

  document.removeEventListener(destroyEventName, destructor)
}

document.addEventListener(destroyEventName, destructor)
