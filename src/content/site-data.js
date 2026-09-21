/*
 * Answer another tab asking about this page.
 */

import { eventSiteData, eventSiteMatches } from '../config.js'
import { on, off } from '../store/store-content.js'

import { run } from './plugin.js'
import cssMatches from './utils/css-matches.js'
import { getActiveElement } from './utils/active-element.js'
import debug from '../debug.js'
import isEditor from './utils/editor.js'

// getActiveElement falls back to the body when nothing is focused,
// and the plugins find their own editor when we pass nothing
function focusedEditor () {
  const element = getActiveElement()
  if (isEditor(element)) {
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

function respondToSiteMatches ({selector} = {}) {
  try {
    return cssMatches(selector)
  } catch (err) {
    debug([eventSiteMatches, selector, err], 'warn')
    return []
  }
}

export function setup () {
  on(eventSiteData, respondToSiteData)
  on(eventSiteMatches, respondToSiteMatches)
}

export function destroy () {
  off(eventSiteData, respondToSiteData)
  off(eventSiteMatches, respondToSiteMatches)
}
