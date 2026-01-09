/* Script that runs in the Main context/ExecutionWorld of the page,
 * and has access to the page JavaScript context.
 *
 * Required to be able to call global/dom-element-attached methods exposed by 3rd party editors.
 */

import Messenger from '../messenger/messenger.js'

import {pageInsertCkEditorTemplate as insertCkEditorTemplate} from '../editors/editor-ckeditor.js'
import {pageInsertPasteTemplate as insertPasteTemplate} from '../editors/editor-paste.js'
import { pageInsertQuillTemplate} from '../editors/editor-quill.js'

const pageMessengerClient = Messenger('page')

pageMessengerClient.respond('ckeditor-insert', (options) => {
  return insertCkEditorTemplate(options)
})

pageMessengerClient.respond('paste-insert', (options) => {
  return insertPasteTemplate(options)
})

pageMessengerClient.respond('quill-insert', (options) => {
  return pageInsertQuillTemplate(options)
})
