import { eventStatus, version, functionsUrl } from '../config.js'

function respondToStatus () {
  document.dispatchEvent(new CustomEvent(eventStatus, {
    detail: {
      version: version
    }
  }))
}

const requestEvent = `${eventStatus}-request`

export function setup () {
  if (window.location.origin !== functionsUrl) {
    return
  }

  document.addEventListener(requestEvent, respondToStatus)
}

export function destroy () {
  document.removeEventListener(requestEvent, respondToStatus)
}
