import browser from 'webextension-polyfill'

import { eventSiteData } from '../config.js'
import { getSettings } from '../store/store-api.js'
import trigger from './background-trigger.js'
import { isBlocklisted } from '../blocklist.js'
import { toUrlPattern, testUrl, pickTab } from './tab-match.js'
import debug from '../debug.js'

const requestType = 'getTabContext'

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
async function requestSiteData (tab) {
  for (const frameId of [0, undefined]) {
    const [data] = await trigger(eventSiteData, {}, tab, frameId) || []
    if (data && Object.keys(data).length) {
      return data
    }
  }

  return {}
}

browser.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req?.type !== requestType) {
    return false
  }

  findTab(req.data, sender.tab?.windowId)
    .then(async (tab) => {
      if (!tab) {
        // no tab matched, {{#site}} renders its else branch
        return sendResponse(null)
      }

      sendResponse({
        tabId: tab.id,
        url: tab.url || '',
        title: tab.title || '',
        // a tab with no plugin still reports itself, for {{css}} and @site
        data: await requestSiteData(tab),
      })
    })
    .catch((err) => {
      debug([requestType, req, err], 'error')
      sendResponse(null)
    })

  return true
})
