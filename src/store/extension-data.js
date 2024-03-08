import browser from 'webextension-polyfill'

import trigger from './store-trigger.js'

const extensionDataKey = 'briskine'
const defaultExtensionData = {
  words: 0,
  templatesLastUsed: {},
  dialogSort: 'last_used',
  dialogTags: true,
  lastSync: Date.now(),
}

export function getExtensionData () {
  return browser.storage.local.get(extensionDataKey)
    .then((data) => {
      return Object.assign({}, defaultExtensionData, data[extensionDataKey])
    })
}

export function setExtensionData (params = {}) {
  return browser.storage.local.get(extensionDataKey)
    .then((data) => {
      // merge existing data with defaults and new data
      return Object.assign({}, defaultExtensionData, data[extensionDataKey], params)
    })
    .then((newData) => {
      const dataWrap = {}
      dataWrap[extensionDataKey] = newData
      return Promise.all([
        newData,
        browser.storage.local.set(dataWrap),
      ])
    })
    .then(([data]) => {
      trigger('extension-data-updated', data)
      return
    })
}
