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

const methods = [
  'getSettings',
  'getAccount',

  'getCustomer',
  'setActiveCustomer',

  'getTemplates',
  'updateTemplateStats',
  'searchTemplates',

  'getTags',

  'signin',
  'logout',

  'getSession',

  'getExtensionData',
  'setExtensionData',

  'openPopup',
  'refetchCollections',
]

let events = []
function on (name, callback) {
  events.push({
    name: name,
    callback: callback
  })
}

function off (name, callback) {
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

const optionsStore = {}
methods.forEach((method) => {
  optionsStore[method] = createRequest(method)
})

optionsStore.on = on
optionsStore.off = off

export default optionsStore
