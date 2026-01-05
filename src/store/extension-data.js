import browser from 'webextension-polyfill'

import trigger from './store-trigger.js'

const extensionDataKey = 'briskine'
const defaultExtensionData = {
  words: 0,
  templatesLastUsed: {},
  dialogSort: 'last_used',
  dialogTags: true,
  lastSync: Date.now(),
  bubbleAllowlist: [],
}

export async function getExtensionData () {
  const data = await browser.storage.local.get(extensionDataKey)
  return {
    ...defaultExtensionData,
    ...data[extensionDataKey],
  }
}

let debouncedTrigger

export async function setExtensionData (params = {}) {
  const data = await browser.storage.local.get(extensionDataKey)
  // merge existing data with defaults and new data
  const newData = {
    ...defaultExtensionData,
    ...data[extensionDataKey],
    ...params,
  }

  const dataWrap = {}
  dataWrap[extensionDataKey] = newData
  await browser.storage.local.set(dataWrap)

  // debounce the event trigger,
  // to reduce the number of events we handle on the receiving end.
  clearTimeout(debouncedTrigger)
  debouncedTrigger = setTimeout(() => {
    trigger('extension-data-updated', newData)
  }, 1000)
}
