import {refetchCollections} from '../store/store-content.js'
import { functionsUrl } from '../config.js'
import debug from '../debug.js'

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
let clearCacheTimer = null
let refetching = Promise.resolve()
function clearCache (collection) {
  if (!batchedUpdates.includes(collection)) {
    batchedUpdates.push(collection)
  }

  if (clearCacheTimer) {
    clearTimeout(clearCacheTimer)
  }

  clearCacheTimer = setTimeout(() => {
    const updates = batchedUpdates.slice()
    // a failed refetch (e.g., offline) can't block the next ones
    refetching = refetching
      .then(() => refetchCollections(updates))
      .catch((err) => debug(['refetchCollections', err], 'warn'))

    clearCacheTimer = null
    batchedUpdates = []
  }, 1000)
}

function dashboardEvent (e) {
  const dashboardEvent = dashboardEvents.find((dEvent) => dEvent.type === e?.data?.type)
  if (dashboardEvent) {
    clearCache(dashboardEvent.collection)
  }
}

export function setup () {
  if (window.location.origin !== functionsUrl) {
    return
  }

  window.addEventListener('message', dashboardEvent)
}

export function destroy () {
  window.removeEventListener('message', dashboardEvent)
}
