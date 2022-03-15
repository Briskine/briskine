/* Facebook plugin
 */

import {parseTemplate} from '../utils.js'
import {createContact} from '../utils/data-parse.js'
import {insertLexicalTemplate} from '../editors/editor-lexical.js'

function getFromDetails () {
  var objectMatch = new RegExp('"NAME":.?".*?"')
  var plainUserObject = ''
  // get full name from inline script
  Array.from(document.scripts).some((script) => {
    var match = (script.textContent || '').match(objectMatch)
    if (!script.src && match) {
      plainUserObject = match[0] || ''
      return true
    }
  })

  var fromName = ''
  try {
    var parsedUserObject = JSON.parse(`{${plainUserObject}}`)
    fromName = parsedUserObject.NAME || '';
  } catch(err) {}

  return createContact({
      name: fromName,
      email: ''
    })
}

function getToDetails (editor) {
  // role=main for messenger
  // data-testid for message popup on facebook
  const parentSelector = `[role=main], [data-testid]`
  const $to = editor.closest(parentSelector).querySelector('img[alt]')

  if ($to) {
    return [
      createContact({
        name: $to.getAttribute('alt'),
        email: ''
      })
    ]
  }

  return []
}

// get all required data from the dom
function getData (params) {
  return {
    from: getFromDetails(),
    to: getToDetails(params.element)
  }
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var facebookUrl = '.facebook.com/';
    var messengerUrl = '.messenger.com/';

    // trigger the extension based on url
    if (
        window.location.href.indexOf(facebookUrl) !== -1 ||
        window.location.href.indexOf(messengerUrl) !== -1
    ) {
        activeCache = true;
    }

    return activeCache;
}

export default (params = {}) => {
    if (!isActive()) {
        return false;
    }

    var data = getData(params);
    var parsedTemplate = parseTemplate(params.quicktext.body, data);

    insertLexicalTemplate(Object.assign({
        text: parsedTemplate
    }, params));

    return true;
};
