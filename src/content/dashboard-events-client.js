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
    console.log('clear collection cache for', batchedUpdates)
    store.clearCollectionCache(batchedUpdates)

    clearCacheTimer = null
    batchedUpdates = []
  }, 500)
}

function dashboardEvent (e) {
  if (e.origin !== config.functionsUrl) {
    return
  }

  const dashboardEvent = dashboardEvents.find((dEvent) => dEvent.type === e?.data?.type)
  if (dashboardEvent) {
    clearCache(dashboardEvent.collection)
  }

  return
}

export function setup () {
  window.addEventListener('message', dashboardEvent)
}

export function destroy () {
  window.removeEventListener('message', dashboardEvent)
}
