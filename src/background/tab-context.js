import browser from 'webextension-polyfill'

import { eventSiteData, eventSiteMatches } from '../config.js'
import { getSettings } from '../store/store-api.js'
import trigger from './background-trigger.js'
import { isBlocklisted } from '../blocklist.js'
import { toUrlPattern, testUrl, pickTab } from './tab-match.js'
import debug from '../debug.js'

const contextRequest = 'getTabContext'
const matchesRequest = 'getSiteMatches'

async function findTab (pattern = '', windowId) {
  let settings = {}
  try {
    settings = await getSettings()
  } catch {
    // logged-out, the private blocklist still applies
  }

  // compile once, then test every tab
  const urlPattern = toUrlPattern(pattern)
  if (!urlPattern) {
    return null
  }

  const tabs = await browser.tabs.query({})
  const candidates = tabs.filter((tab) => {
    return tab.id
      && testUrl(urlPattern, tab.url)
      && !isBlocklisted(settings, tab.url)
  })

  return pickTab(candidates, windowId)
}

// without a frameId every frame answers and the first one wins,
// so try the top frame before falling back to the whole tab
async function askTab (tab, event, details, hasResult) {
  for (const frameId of [0, undefined]) {
    const [result] = await trigger(event, details, tab, frameId) || []
    if (hasResult(result)) {
      return result
    }
  }

  return null
}

async function getTabContext (pattern, windowId) {
  const tab = await findTab(pattern, windowId)
  if (!tab) {
    // no tab matched, {{#site}} renders its else branch
    return null
  }

  return {
    url: tab.url || '',
    title: tab.title || '',
    // a tab with no plugin still reports itself, for {{css}} and @site
    data: await askTab(tab, eventSiteData, {}, (data) => Object.keys(data || {}).length) || {},
  }
}

async function getSiteMatches ({pattern, selector} = {}, windowId) {
  const tab = await findTab(pattern, windowId)
  if (!tab) {
    return []
  }

  return await askTab(tab, eventSiteMatches, {selector: selector}, (matches) => matches?.length) || []
}

browser.runtime.onMessage.addListener((req, sender, sendResponse) => {
  const handlers = {
    [contextRequest]: getTabContext,
    [matchesRequest]: getSiteMatches,
  }

  const handler = handlers[req?.type]
  if (!handler) {
    return false
  }

  handler(req.data, sender.tab?.windowId)
    .then(sendResponse)
    .catch((err) => {
      debug([req.type, req.data, err], 'error')
      sendResponse(null)
    })

  return true
})
