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
async function sendToContent (params = {}) {
  const manifest = browser.runtime.getManifest()
  const contentScripts = manifest.content_scripts[0]

  const tabs = await browser.tabs.query({
    url: contentScripts.matches,
    discarded: false,
  })

  return tabs.map((tab) => browser.tabs.sendMessage(tab.id, params))
}

async function sendEvent (data) {
  const params = {
    type: 'trigger',
    data: data,
  }

  // send trigger message to client store
  const results = await Promise.allSettled([
    sendToPopup(params),
    sendToContent(params),
  ])

  results.forEach((result) => {
    if (result.status === 'rejected') {
      debug(['trigger', params.data.name, result], 'error')
    }
  })
}

let queue = []
let timer = null

function runQueue () {
  return Promise
    .allSettled(queue.map((d) => sendEvent(d)))
    .then(() => {
      queue = []
      return
    })
}

export default function trigger (name, details, timeout = 1000) {
  const existing = queue.find((d) => d.name === name)
  if (existing) {
    existing.details = details
  } else {
    const data = {
      name: name,
      details: details,
    }
    queue.push(data)
  }

  if (timer) {
    clearTimeout(timer)
  }

  if (timeout === 0) {
    return runQueue()
  }

  return new Promise((resolve) => {
    timer = setTimeout(() => {
      runQueue().then(resolve)
    }, timeout)
  })
}
