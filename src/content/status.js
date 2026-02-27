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
  if (window.location.origin !== functionsUrl) {
    return
  }

  document.addEventListener(requestEvent, respondToStatus)
  on(eventStatus, respondToIsAlive)
}

export function destroy () {
  document.removeEventListener(requestEvent, respondToStatus)
  off(eventStatus, respondToIsAlive)
}
