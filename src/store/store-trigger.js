/* Trigger events from the background store
 */
import browser from 'webextension-polyfill'

import debug from './store-debug.js'

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

// send message to content scripts in all tabs
async function sendToContent(params = {}) {
  const manifest = browser.runtime.getManifest()
  const contentScripts = manifest.content_scripts[0]

  const tabs = await browser.tabs.query({
    url: contentScripts.matches,
    discarded: false,
  })

  return tabs.map((tab) => browser.tabs.sendMessage(tab.id, params))
}

export default async function trigger (name = '', details = {}) {
  const event = {
    type: 'trigger',
    data: {
      name: name,
      details: details,
    },
  }

  // send trigger message to client store
  const results = await Promise.allSettled([
    sendToPopup(event),
    sendToContent(event),
  ])

  results.forEach((result) => {
    if (result.status === 'rejected') {
      debug(['trigger', event.data.name, result], 'error')
    }
  })
}
