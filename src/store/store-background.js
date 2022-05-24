/* globals ENV */
import browser from 'webextension-polyfill'

import * as storeApi from './store-api.js'

function trigger (name) {
  const data = {
    type: 'trigger',
    data: {
      name: name
    }
  }

  // send trigger message to client store
  return Promise
    .all([
      // send message to popup
      browser.runtime.sendMessage(data),
      // send message to content script
      browser.tabs.query({}).then((tabs) => {
        return tabs.map((tab) => browser.tabs.sendMessage(tab.id, data))
      })
    ])
    .catch(() => {
      return debug(
        [
          'browser.runtime.lastError',
          browser.runtime.lastError.message,
          name
        ],
        'warn'
      )
    })
}

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

function signin (params = {}) {
  return storeApi.signin(params)
    .then(() => {
      return trigger('login')
    })
}

function logout () {
  return storeApi.logout()
    .then(() => {
      return trigger('logout')
    })
}

function getSession () {
  return storeApi.getSession()
    .then(() => {
      return trigger('login')
    })
}

const store = Object.assign({}, storeApi)
store.getTemplates = getTemplates
store.updateTemplateStats = updateTemplateStats
store.signin = signin
store.logout = logout
store.getSession = getSession

function debug (data = [], method = 'log') {
  if (ENV === 'production') {
      return;
  }

  /* eslint-disable no-console */
  console.group(data.shift());
  data.forEach((item) => {
      console[method](item);
  });
  console.groupEnd();
  /* eslint-enable no-console */
}

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

  return
})
