import browser from 'webextension-polyfill'

import * as storeApi from './store-api.js'
import debug from '../debug.js'

// respond to content
browser.runtime.onMessage.addListener((req) => {
  if (
    req.type &&
    typeof storeApi[req.type] === 'function'
  ) {
    return storeApi[req.type](req.data).then((data = {}) => {
      return data
    }).catch((err) => {
      debug([req.type, req.data, err], 'warn')

      // catch errors on client
      return {
        storeError: err
      }
    })
  }
})
