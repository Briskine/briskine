import browser from 'webextension-polyfill'

import { eventSiteData, eventSiteMatches } from '../config.js'
import { getSettings } from '../store/store-api.js'
import trigger from './background-trigger.js'
import { isBlocklisted } from '../blocklist.js'
import { toUrlPattern, testUrl, sortTabs } from './tab-match.js'
import debug from '../debug.js'

const contextRequest = 'getTabContext'
const matchesRequest = 'getSiteMatches'

async function allowedSettings () {
  try {
    return await getSettings()
  } catch {
    return {}
  }
}

async function findTabs (pattern = '') {
  const settings = await allowedSettings()

  // compile once, then test every tab
  const urlPattern = toUrlPattern(pattern)
  if (!urlPattern) {
    return []
  }

  // only the tabs a content script could run in
  const [contentScripts] = browser.runtime.getManifest().content_scripts
  const tabs = await browser.tabs.query({url: contentScripts.matches})
  return tabs.filter((tab) => {
    return tab.id
      && testUrl(urlPattern, tab.url)
      && !isBlocklisted(settings, tab.url)
  })
}

// works for both an object of plugin data and an array of matches
function hasResult (result) {
  return Object.keys(result || {}).length > 0
}

// without a frameId every frame answers and the first one wins,
// so prefer the top frame over the whole tab.
// both are asked at once, a tab with nothing in its top frame shouldn't wait twice.
// null only when the tab never answered, so callers can try the next one.
async function askTab (tab, event, details) {
  const [top, all] = [0, undefined].map((frameId) => {
    return trigger(event, details, tab, frameId).then((response) => response?.[0])
  })

  const topResult = await top
  if (hasResult(topResult)) {
    return topResult
  }

  const allResult = await all
  if (hasResult(allResult)) {
    return allResult
  }

  return allResult || topResult || null
}

function tabContext (tab, data) {
  return {
    tabId: tab.id,
    url: tab.url || '',
    title: tab.title || '',
    data: data,
  }
}

async function getTabContext ({pattern} = {}, windowId) {
  const tabs = sortTabs(await findTabs(pattern), windowId)
  if (!tabs.length) {
    // no tab matched, {{#site}} renders its else branch
    return null
  }

  for (const tab of tabs) {
    // a tab we can't reach shouldn't hide the next match
    const data = await askTab(tab, eventSiteData, {})
    if (data) {
      return tabContext(tab, data)
    }
  }

  // nothing answered, still report the best match for {{css}} and @site
  return tabContext(tabs[0], {})
}

async function getSiteMatches ({tabId, selector} = {}) {
  const [settings, tab] = await Promise.all([
    allowedSettings(),
    // rejects when the tab is gone
    browser.tabs.get(tabId).catch(() => null),
  ])

  if (!tab || isBlocklisted(settings, tab.url)) {
    return []
  }

  return await askTab(tab, eventSiteMatches, {selector: selector}) || []
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
