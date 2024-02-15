import config from '../config.js'

function respondToStatus () {
  document.dispatchEvent(new CustomEvent(config.eventStatus, {
    detail: {
      version: config.version
    }
  }))
}

const requestEvent = `${config.eventStatus}-request`

export function setup () {
  if (window.location.origin !== config.functionsUrl) {
    return
  }

  document.addEventListener(requestEvent, respondToStatus)
}

export function destroy () {
  document.removeEventListener(requestEvent, respondToStatus)
}
