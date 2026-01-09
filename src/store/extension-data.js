import browser from 'webextension-polyfill'

import trigger from '../background/background-trigger.js'

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

  trigger('extension-data-updated', newData)
}
