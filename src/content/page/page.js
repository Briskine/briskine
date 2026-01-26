/* Script that runs in the Main context/ExecutionWorld of the page,
 * and has access to the page JavaScript context.
 *
 * Required to be able to call global/dom-element-attached methods exposed by 3rd party editors.
 */

import Messenger from '../messenger/messenger.js'

import { pageInsertCkEditorTemplate } from '../editors/editor-ckeditor.js'
import { pageInsertPasteTemplate } from '../editors/editor-paste.js'
import { pageInsertQuillTemplate } from '../editors/editor-quill.js'
import { pageInsertBeforeInputTemplate } from '../editors/editor-beforeinput.js'

const pageMessengerClient = Messenger('page')

pageMessengerClient.respond('ckeditor-insert', (options) => {
  return pageInsertCkEditorTemplate(options)
})

pageMessengerClient.respond('paste-insert', (options) => {
  return pageInsertPasteTemplate(options)
})

pageMessengerClient.respond('beforeinput-insert', (options) => {
  return pageInsertBeforeInputTemplate(options)
})

pageMessengerClient.respond('quill-insert', (options) => {
  return pageInsertQuillTemplate(options)
})
