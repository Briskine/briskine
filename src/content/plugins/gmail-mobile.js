/* eslint-disable no-useless-escape */
/* Gmail mobile (small-screen) plugin
 */

import parseTemplate from '../utils/parse-template.js'
import {insertTemplate} from '../editors/editor-universal.js'
import createContact from '../utils/create-contact.js'
import {enableBubble} from '../bubble/bubble.js'
import {addAttachments} from '../attachments/attachments.js'

const fromFieldSelector = '.az2';
const textfieldContainerSelector = '.M9';

// get all required data from the dom
function getData (params) {
  const data = {
    from: [],
    to: [],
    cc: [],
    bcc: [],
    subject: '',
  }


  return data
}

let activeCache = null
const gmailMobileToken = '/mu/'
function isActive () {
  if (activeCache !== null) {
    return activeCache
  }

  activeCache = false
  // trigger the extension based on url
  if (
    window.location.host === 'mail.google.com'
    && window.location.href.includes(gmailMobileToken)
  ) {
    activeCache = true
  }

  return activeCache
}

function setup () {
  if (!isActive()) {
    return false
  }

  enableBubble()
}

setup()

export default async (params = {}) => {
  if (!isActive()) {
    return false
  }

  var data = getData(params)
  const parsedTemplate = addAttachments(
    await parseTemplate(params.quicktext.body, data),
    params.quicktext.attachments
  )

  insertTemplate(Object.assign({
    text: parsedTemplate
  }, params))

  return true
}
