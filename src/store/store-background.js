import browser from 'webextension-polyfill'

import * as storeApi from './store-api.js'
import debug from '../debug.js'

// respond to content
browser.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (
    req.type &&
    typeof storeApi[req.type] === 'function'
  ) {
    storeApi[req.type](req.data)
      .then((data = {}) => {
        sendResponse(data)
      })
      .catch((err) => {
        debug([req.type, req.data, err], 'warn')

        // catch errors on client
        sendResponse({
          storeError: err
        })
      })

    return true
  }

  return false
})
