/*
 * Ask the background about another open tab.
 */

import { createRequest } from '../../store/store-content.js'

const requestTabContext = createRequest('getTabContext')
const requestSiteMatches = createRequest('getSiteMatches')

async function ask (request, data, fallback) {
  try {
    return await request(data) || fallback
  } catch {
    // no tab matched, or the extension was updated under us
    return fallback
  }
}

export async function getSiteContext (pattern = '') {
  if (!pattern) {
    return null
  }

  return ask(requestTabContext, {pattern: pattern}, null)
}

export async function getSiteMatches (tabId, selector = '') {
  if (!tabId || !selector) {
    return []
  }

  return ask(requestSiteMatches, {tabId: tabId, selector: selector}, [])
}
