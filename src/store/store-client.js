import browser from 'webextension-polyfill'

import { eventDestroy } from '../config.js'

function createRequest (type) {
  return async function (params) {
    try {
      // get from background
      const data = await browser.runtime.sendMessage({
        type: type,
        data: params,
      })

      // handle errors
      if (data?.storeError) {
        throw data.storeError
      }

      return data
    } catch (err) {
      // extension context invalidated
      if (!browser.runtime.id) {
        // destroy existing content scripts
        return document.dispatchEvent(new CustomEvent(eventDestroy))
      }

      throw err
    }
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

export function trigger (name, details = {}) {
  events.filter((event) => event.name === name).forEach((event) => {
    if (typeof event.callback === 'function') {
      event.callback(details)
    }
  })
}

// handle trigger from background
browser.runtime.onMessage.addListener((req) => {
  if (
    req.type &&
    req.type === 'trigger'
  ) {
    trigger(req.data.name, req.data.details)
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
