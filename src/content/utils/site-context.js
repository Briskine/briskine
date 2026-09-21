/*
 * Ask the background about another open tab.
 */

import { createRequest } from '../../store/store-content.js'

const requestTabContext = createRequest('getTabContext')
const requestSiteMatches = createRequest('getSiteMatches')

export async function getSiteContext (pattern = '') {
  if (!pattern) {
    return null
  }

  try {
    return await requestTabContext(pattern) || null
  } catch {
    // no tab matched, or the extension was updated under us
    return null
  }
}

export async function getSiteMatches (pattern = '', selector = '') {
  if (!pattern || !selector) {
    return []
  }

  try {
    return await requestSiteMatches({pattern: pattern, selector: selector}) || []
  } catch {
    return []
  }
}
