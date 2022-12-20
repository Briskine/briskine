/* Trigger events from the background store
 */
import browser from 'webextension-polyfill'

import debug from './store-debug.js'

export function trigger (name, details) {
  const data = {
    type: 'trigger',
    data: {
      name: name,
      details: details,
    }
  }

  // send trigger message to client store
  return Promise
    .all([
      // send message to popup
      browser.runtime.sendMessage(data)
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
          .map((tab) => browser.tabs.sendMessage(tab.id, data))
      })
    ])
    .catch((err) => {
      return debug(
        ['trigger', name, err],
        'error'
      )
    })
}
