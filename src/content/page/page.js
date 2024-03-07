/* Script that runs in the Main context/ExecutionWorld of the page,
 * and has access to the page JavaScript context.
 *
 * Required to be able to call global/dom-element-attached methods exposed by 3rd party editors.
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
