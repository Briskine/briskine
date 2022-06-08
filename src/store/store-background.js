import browser from 'webextension-polyfill'

import * as storeApi from './store-api.js'
import {debug} from './store-trigger.js'

const lastuseCache = {}
function updateTemplateStats (id) {
  lastuseCache[id] = {
    lastuse_datetime: new Date().toISOString()
  }
  return Promise.resolve(lastuseCache)
}

// extend getTemplate to include lastuse_datetime
function getTemplates () {
  return storeApi.getTemplates()
    .then((templates) => {
      return templates.map((t) => {
        return Object.assign({}, t, lastuseCache[t.id])
      })
    })
}

const store = Object.assign({}, storeApi)
store.getTemplates = getTemplates
store.updateTemplateStats = updateTemplateStats

// respond to content
browser.runtime.onMessage.addListener((req) => {
  if (
    req.type &&
    typeof store[req.type] === 'function'
  ) {
    return store[req.type](req.data).then((data = {}) => {
      // debug store calls
      debug([req.type, req.data, data])

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
