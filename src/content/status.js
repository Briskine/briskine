import { eventStatus, version, functionsUrl } from '../config.js'
import { on, off } from '../store/store-content.js'

function respondToStatus () {
  document.dispatchEvent(new CustomEvent(eventStatus, {
    detail: {
      version: version
    }
  }))
}

const requestEvent = `${eventStatus}-request`

function respondToIsAlive () {
  return true
}

export function setup () {
  on(eventStatus, respondToIsAlive)

  if (window.location.origin === functionsUrl) {
    document.addEventListener(requestEvent, respondToStatus)
  }
}

export function destroy () {
  off(eventStatus, respondToIsAlive)
  document.removeEventListener(requestEvent, respondToStatus)
}
