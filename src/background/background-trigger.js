/* Trigger events from the background store
 */
import browser from 'webextension-polyfill'

import debug from './debug.js'

// expected error when
// the popup is not loaded,
// or when the extension is not loaded in certain opened tabs,
// because the urls are blocklisted or restricted (like the chrome web store).
function isNotAvailableError (err) {
  return err?.message?.includes?.('Receiving end does not exist')
}

// send message to popup
function sendToPopup (params = {}) {
  return browser.runtime.sendMessage(params)
}

// send message to all tabs
async function sendToAllTabs (params = {}) {
  const manifest = browser.runtime.getManifest()
  const contentScripts = manifest.content_scripts[0]

  const tabs = await browser.tabs.query({
    url: contentScripts.matches,
    discarded: false,
  })

  return tabs.map((tab) => sendToTab(params, tab.id))
}

async function sendToTab (params = {}, tabId, frameId) {
  return browser.tabs.sendMessage(tabId, params, { frameId: frameId })
}

export default async function trigger (name = '', details = {}, tabId, frameId) {
  const event = {
    type: 'trigger',
    data: {
      name: name,
      details: details,
    },
  }

  let results = []

  if (tabId) {
    results = [
      sendToTab(event, tabId, frameId),
    ]
  } else {
    results = [
      sendToPopup(event),
      ...await sendToAllTabs(event),
    ]
  }

  results = await Promise.allSettled(results)
  results.forEach((result) => {
    if (
      result?.status === 'rejected'
      && !isNotAvailableError(result?.reason)
    ) {
      debug(['trigger', event.data.name, result], 'error')
    }
  })
}
