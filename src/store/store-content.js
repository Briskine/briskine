/**
 * Sync Content Store
 */
import store from './store-client.js'
import methods from './store-methods.js'

let cache = {}

const cachedMethods = [
  'getSettings',
  'getAccount',
  'getCustomer',
  'getTemplates',
  'getTags',
  'getExtensionData',
]

const contentStore = {}
methods.forEach((method) => {
  contentStore[method] = async (params) => {
    if (cache[method]) {
      return cache[method]
    }

    const response = await store[method](params)
    if (cachedMethods.includes(method)) {
      cache[method] = response
    }

    return response
  }
})

contentStore.on = store.on
contentStore.off = store.off

contentStore.setup = async () => {
  await Promise.allSettled(
    cachedMethods.map((m) => contentStore(m))
  )

  store.on('users-updated', usersUpdated)
  store.on('templates-updated', templatesUpdated)
  store.on('tags-updated', tagsUpdated)
  store.on('extension-data-updated', extensionDataUpdated)
}

contentStore.destroy = () => {
  cache = {}

  store.off('users-updated', usersUpdated)
  store.off('templates-updated', templatesUpdated)
  store.off('tags-updated', tagsUpdated)
  store.off('extension-data-updated', extensionDataUpdated)
}

function usersUpdated () {
  cache.getSettings = null
  cache.getAccount = null
  cache.getCustomer = null
}

function templatesUpdated () {
  cache.getTemplates = null
}

function tagsUpdated () {
  cache.getTags = null
}

function extensionDataUpdated () {
  cache.getExtensionData = null
}

export default contentStore
