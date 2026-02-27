/* Trigger events from the background store
 */
import browser from 'webextension-polyfill'

import debug from '../debug.js'

// expected error when
// the popup is not loaded,
// or when the extension is not loaded in certain opened tabs,
// because the urls are blocklisted or restricted (like the chrome web store).
function isNotAvailableError (err) {
  return err?.message?.includes?.('Receiving end does not exist')
}

// send message to popup
async function sendToPopup (params = {}) {
  try {
    const response = await browser.runtime.sendMessage(params)
    return response
  } catch (err) {
    if (!isNotAvailableError(err)) {
      debug(['trigger', params, err], 'error')
    }
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

  return Promise.all(tabs.map((tab) => sendToTab(params, tab)))
}

async function sendToTab (params = {}, tab, frameId) {
  try {
    const response = await browser.tabs.sendMessage(tab.id, params, { frameId: frameId })
    return response
  } catch (err) {
    const errorType = isNotAvailableError(err) ? 'warn' : 'error'
    debug(['trigger', params, tab, err], errorType)
  }
}

export default function trigger (name = '', details = {}, tab, frameId) {
  const event = {
    type: 'trigger',
    data: {
      name: name,
      details: details,
    },
  }

  if (tab) {
    return sendToTab(event, tab, frameId)
  }

  return Promise.all([
    sendToPopup(event),
    sendToAllTabs(event),
  ])
}
