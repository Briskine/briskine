/* Trigger events from the background store
 */
import browser from 'webextension-polyfill'

import debug from '../background/debug.js'

// send message to popup
async function sendToPopup (params = {}) {
  try {
    await browser.runtime.sendMessage(params)
  } catch (err) {
    if (
      err.message
      && err.message === 'Could not establish connection. Receiving end does not exist.'
    ) {
      // popup is not loaded
      return
    }

    throw err
  }
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
  return browser.tabs.sendMessage(tabId, params, {frameId: frameId})
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
      sendToTab(event, tabId, frameId)
    ]
  } else {
    results = [
      sendToPopup(event),
      sendToAllTabs(event),
    ]
  }

  results = await Promise.allSettled(results)

  results.forEach((result) => {
    if (result?.status === 'rejected') {
      debug(['trigger', event.data.name, result], 'error')
    }
  })
}
