/* Script runs in the full context of the page,
 * and has access to the page JavaScript context.
 *
 * The content script runs in an "isolated world" context,
 * and doesn't have access to the full JavaScript context.
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world
 *
 * When we upgrade to Manifest v3, we'll be able to use
 * chrome.scripting.executeScript with ExecutionWorld,
 * and this script will be obsolete.
 */

import config from '../../config.js'

import {insertCkEditorText} from '../editors/editor-ckeditor.js'

let port2

function handleInitMessage (e) {
  if (e.data.type === 'page-init') {
    port2 = e.ports[0]
    port2.onmessage = onMessage
    window.removeEventListener('message', handleInitMessage)
  }
}

window.addEventListener('message', handleInitMessage)

function onMessage (e) {
  const detail = e.data || {}

  if (detail.type === 'ckeditor-insert') {
    insertCkEditorText(document.activeElement, detail.data)
  }

  port2.postMessage({
    type: config.eventPage,
  })
}
