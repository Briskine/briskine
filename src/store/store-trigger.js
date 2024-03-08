/* Trigger events from the background store
 */
import browser from 'webextension-polyfill'

import debug from './store-debug.js'

function sendEvent (data) {
  const params = {
    type: 'trigger',
    data: data,
  }

  // send trigger message to client store
  return Promise
    .allSettled([
      // send message to popup
      browser.runtime.sendMessage(params)
        .catch((err) => {
          if (err.message && err.message === 'Could not establish connection. Receiving end does not exist.') {
            // popup is not loaded
            return
          }

          throw err
        }),
      // send message to content script
      browser.tabs.query({}).then((tabs) => {
        return tabs
          .filter((tab) => tab.url.includes('http://') || tab.url.includes('https://'))
          .map((tab) => browser.tabs.sendMessage(tab.id, params))
      })
    ])
    .then((results) => {
      results.forEach((result) => {
        if (result.status === 'rejected') {
          debug(['trigger', params.data.name, result], 'error')
        }
      })

      return
    })
}

let queue = []
let timer = null
export default function trigger (name, details) {
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

  return new Promise((resolve) => {
    timer = setTimeout(() => {
      Promise.allSettled(queue.map((d) => sendEvent(d))).then(() => {
        queue = []
        resolve()
      })
    }, 1000)
  })
}
