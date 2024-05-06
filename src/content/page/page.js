/* Script that runs in the Main context/ExecutionWorld of the page,
 * and has access to the page JavaScript context.
 *
 * Required to be able to call global/dom-element-attached methods exposed by 3rd party editors.
 */

import Messenger from '../messenger/messenger.js'

import {insertCkEditorText} from '../editors/editor-ckeditor.js'

const pageMessengerClient = Messenger()

pageMessengerClient.respond('ckeditor-insert', (options) => {
  return insertCkEditorText(document.activeElement, options)
})
