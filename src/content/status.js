import { eventStatus, version, functionsUrl } from '../config.js'
import browser from 'webextension-polyfill'

function respondToStatus () {
  document.dispatchEvent(new CustomEvent(eventStatus, {
    detail: {
      version: version
    }
  }))
}

const requestEvent = `${eventStatus}-request`

function respondToIsAlive (request, sender, sendResponse) {
    if (request.type === 'STATUS') { 
      sendResponse({ response: true })
      return true
    } 
  }

export function setup () {
  browser.runtime.onMessage.addListener(respondToIsAlive)

  if (window.location.origin !== functionsUrl) {
    return
  }

  document.addEventListener(requestEvent, respondToStatus)
}

export function destroy () {
  document.removeEventListener(requestEvent, respondToStatus)
  browser.runtime.onMessage.removeListener(respondToIsAlive)
}
