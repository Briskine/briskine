/*
 * Answer another tab asking for this page's plugin data.
 */

import { eventSiteData } from '../config.js'
import { on, off } from '../store/store-content.js'

import { run } from './plugin.js'
import { getActiveElement } from './utils/active-element.js'
import { isContentEditable } from './editors/editor-contenteditable.js'
import { isTextfieldEditor } from './editors/editor-textfield.js'
import debug from '../debug.js'

// getActiveElement falls back to the body when nothing is focused,
// and the plugins find their own editor when we pass nothing
function focusedEditor () {
  const element = getActiveElement()
  if (isTextfieldEditor(element) || isContentEditable(element)) {
    return element
  }

  return null
}

async function respondToSiteData () {
  try {
    const element = focusedEditor()
    return await run('data', element ? {element: element} : {})
  } catch (err) {
    debug([eventSiteData, err], 'error')
    return {}
  }
}

export function setup () {
  on(eventSiteData, respondToSiteData)
}

export function destroy () {
  off(eventSiteData, respondToSiteData)
}
