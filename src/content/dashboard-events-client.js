import store from '../store/store-client.js'
import config from '../config.js'

const prefix = 'briskine-dashboard'

const dashboardEvents = [
  'templates',
  'tags',
  'users',
  'customers',
].map((c) => {
  return {
    type: `${prefix}-${c}-updated`,
    collection: c,
  }
})

let batchedUpdates = []
let clearCacheTimer
function clearCache (collection) {
  if (!batchedUpdates.includes(collection)) {
    batchedUpdates.push(collection)
  }

  if (clearCacheTimer) {
    clearTimeout(clearCacheTimer)
  }

  clearCacheTimer = setTimeout(() => {
    store.refetchCollections(batchedUpdates)

    clearCacheTimer = null
    batchedUpdates = []
  }, 1000)
}

const templateCollections = [
  'templatesOwned',
  'templatesShared',
  'templatesEveryone',
]

function dashboardEvent (e) {
  if (e.origin !== config.functionsUrl) {
    return
  }

  const dashboardEvent = dashboardEvents.find((dEvent) => dEvent.type === e?.data?.type)
  if (dashboardEvent) {
    if (dashboardEvent.collection === 'templates') {
      templateCollections.forEach((tc) => {
        clearCache(tc)
      })
    } else {
      clearCache(dashboardEvent.collection)
    }
  }
}

export function setup () {
  window.addEventListener('message', dashboardEvent)
}

export function destroy () {
  window.removeEventListener('message', dashboardEvent)
}
