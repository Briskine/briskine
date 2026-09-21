/*
 * Ask the background for the context of another open tab.
 */

import { createRequest } from '../../store/store-content.js'

const requestTabContext = createRequest('getTabContext')

export default async function getSiteContext (pattern = '') {
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
