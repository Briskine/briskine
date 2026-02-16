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

export function setup () {
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => { 
    if (request.type === 'STATUS') { 
      sendResponse({ response: true })
      return true
    } 
  })  

  if (window.location.origin !== functionsUrl) {
    return
  }

  document.addEventListener(requestEvent, respondToStatus)
}

export function destroy () {
  document.removeEventListener(requestEvent, respondToStatus)
}
