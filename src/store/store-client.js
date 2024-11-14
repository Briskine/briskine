import browser from 'webextension-polyfill'

import config from '../config.js'

function createRequest (type) {
  return (params) => {
    return new Promise((resolve, reject) => {
      // get from background
      browser.runtime.sendMessage({
        type: type,
        data: params
      }).then((data) => {
        // handle errors
        if (data && data.storeError) {
          return reject(data.storeError)
        }

        return resolve(data)
      }).catch((err) => {
        // extension context invalidated
        if (!browser.runtime.id) {
          // destroy existing content scripts
          return document.dispatchEvent(new CustomEvent(config.destroyEvent))
        }

        return reject(err)
      })
    })
  }
}

let events = []
export function on (name, callback) {
  events.push({
    name: name,
    callback: callback
  })
}

export function off (name, callback) {
  events = events.filter((e) => {
    if (e.name === name && e.callback === callback) {
      return false
    }
    return true
  })
}

function trigger (data = {}) {
  events.filter((event) => event.name === data.name).forEach((event) => {
    if (typeof event.callback === 'function') {
      event.callback(data.details)
    }
  })
}

// handle trigger from background
browser.runtime.onMessage.addListener((req) => {
  if (
    req.type &&
    req.type === 'trigger'
  ) {
    trigger(req.data)
  }
})

export const getSettings = createRequest('getSettings')
export const getAccount = createRequest('getAccount')
export const getCustomer = createRequest('getCustomer')
export const setActiveCustomer = createRequest('setActiveCustomer')
export const getTemplates = createRequest('getTemplates')
export const updateTemplateStats = createRequest('updateTemplateStats')
export const searchTemplates = createRequest('searchTemplates')
export const getTags = createRequest('getTags')
export const signin = createRequest('signin')
export const logout = createRequest('logout')
export const getSession = createRequest('getSession')
export const getExtensionData = createRequest('getExtensionData')
export const setExtensionData = createRequest('setExtensionData')
export const openPopup = createRequest('openPopup')
export const refetchCollections = createRequest('refetchCollections')
export const autosync = createRequest('autosync')
export const isCached = createRequest('isCached')
