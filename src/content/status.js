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
  document.addEventListener(requestEvent, respondToStatus)
}

export function destroy () {
  document.removeEventListener(requestEvent, respondToStatus)
}
