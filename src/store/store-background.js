import browser from 'webextension-polyfill'

import * as storeApi from './store-api.js'
import debug from '../debug.js'

// only for extension pages, eg. the popup
const extensionPageRequests = [
  'signin',
  'logout',
  'getSession',
  'getCustomer',
  'setActiveCustomer',
  'autosync',
  'getSignedInUser',
]

// the extension data content scripts can change
const contentExtensionData = ['dialogSort', 'dialogTags']

// the popup can also open in a tab
function isExtensionPage (sender = {}) {
  return !sender.tab || Boolean(sender.url?.startsWith(browser.runtime.getURL('')))
}

// respond to content
browser.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (
    req.type &&
    typeof storeApi[req.type] === 'function' &&
    sender.id === browser.runtime.id
  ) {
    let data = req.data
    if (!isExtensionPage(sender)) {
      if (extensionPageRequests.includes(req.type)) {
        return false
      }

      if (req.type === 'setExtensionData') {
        data = Object.fromEntries(Object.entries(data || {}).filter(([key]) => contentExtensionData.includes(key)))
      }
    }

    storeApi[req.type](data)
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
