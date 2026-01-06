/**
 * Sync Content Store
 */
import {
  getSettings as storeGetSettings,
  getAccount as storeGetAccount,
  getExtensionData as storeGetExtensionData,
  getTemplates as storeGetTemplates,
  getTags as storeGetTags,
  on,
  off,
  isCached,
} from './store-client.js'

export {
  getCustomer,
  setActiveCustomer,
  updateTemplateStats,
  searchTemplates,
  signin,
  logout,
  getSession,
  setExtensionData,
  openPopup,
  refetchCollections,
  autosync,
  isCached,
  on,
  off,
  trigger,
} from './store-client.js'

let cache = {}

function cachedMethod (method = async () => {}, key = '') {
  return async function (params) {
    if (cache[key]) {
      return cache[key]
    }

    const response = await method(params)
    cache[key] = response

    return response
  }
}

export const getSettings = cachedMethod(storeGetSettings, 'getSettings')
export const getAccount = cachedMethod(storeGetAccount, 'getAccount')
export const getTemplates = cachedMethod(storeGetTemplates, 'getTemplates')
export const getTags = cachedMethod(storeGetTags, 'getTags')
export const getExtensionData = cachedMethod(storeGetExtensionData, 'getExtensionData')

function clear () {
  cache = {}
}

function usersUpdated () {
  cache.getSettings = null
  cache.getAccount = null
}

function templatesUpdated (templates = []) {
  cache.getTemplates = templates
}

function tagsUpdated (tags = []) {
  cache.getTags = tags
}

function extensionDataUpdated (data = {}) {
  cache.getExtensionData = data
}

export async function setup () {
  on('login', clear)
  on('logout', clear)
  on('users-updated', usersUpdated)
  on('templates-updated', templatesUpdated)
  on('tags-updated', tagsUpdated)
  on('extension-data-updated', extensionDataUpdated)

  const cached = await isCached()
  if (cached === true) {
    Promise.allSettled([
      getSettings(),
      getAccount(),
      getTemplates(),
      getTags(),
      getExtensionData(),
    ])
  }
}

export async function destroy () {
  off('login', clear)
  off('logout', clear)
  off('users-updated', usersUpdated)
  off('templates-updated', templatesUpdated)
  off('tags-updated', tagsUpdated)
  off('extension-data-updated', extensionDataUpdated)

  cache = {}
}
