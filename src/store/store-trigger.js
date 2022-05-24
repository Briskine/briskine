/* globals ENV */
/* Trigger events from the background store
 */
import browser from 'webextension-polyfill'

let debug = () => {}
if (ENV !== 'production') {
  debug = (data = [], method = 'log') => {
    /* eslint-disable no-console */
    console.group(data.shift())
    data.forEach((item) => {
      console[method](item)
    })
    console.groupEnd()
    /* eslint-enable no-console */
  }
}

export {debug}

export function trigger (name) {
  const data = {
    type: 'trigger',
    data: {
      name: name
    }
  }

  // send trigger message to client store
  return Promise
    .all([
      // send message to popup
      browser.runtime.sendMessage(data),
      // send message to content script
      browser.tabs.query({}).then((tabs) => {
        return tabs.map((tab) => browser.tabs.sendMessage(tab.id, data))
      })
    ])
    .catch(() => {
      return debug(
        [
          'browser.runtime.lastError',
          browser.runtime.lastError.message,
          name
        ],
        'warn'
      )
    })
}
