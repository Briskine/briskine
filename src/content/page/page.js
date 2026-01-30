/* Script that runs in the Main context/ExecutionWorld of the page,
 * and has access to the page JavaScript context.
 *
 * Required to be able to call global/dom-element-attached methods exposed by 3rd party editors.
 */

import Messenger from '../messenger/messenger.js'

import { pageInsertPasteTemplate } from '../editors/editor-paste.js'
import { pageInsertQuill1Template } from '../editors/editor-quill1.js'
import { pageInsertBeforeInputTemplate } from '../editors/editor-beforeinput.js'

const pageMessengerClient = Messenger('page')

pageMessengerClient.respond('paste-insert', (options) => {
  return pageInsertPasteTemplate(options)
})

pageMessengerClient.respond('beforeinput-insert', (options) => {
  return pageInsertBeforeInputTemplate(options)
})

pageMessengerClient.respond('quill1-insert', (options) => {
  return pageInsertQuill1Template(options)
})
