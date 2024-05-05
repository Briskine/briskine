/* globals chrome, browser */
import Messenger from '../messenger/messenger.js'

let pageMessengerServer = Messenger({type: 'server'})
let pageScript

export function request (type, options) {
  return pageMessengerServer.request(type, options)
}

export function setup () {
  pageScript = document.createElement('script')
  pageScript.src = (chrome || browser).runtime.getURL('page/page.js')
  pageScript.onload = function () {
    // create a new message channel, in case the old one was neutered,
    // on subsequent startup retries (eg. in dynamically created iframes).
    if (!pageMessengerServer) {
      pageMessengerServer = Messenger({type: 'server'})
    }
    pageMessengerServer.handshake(window)

    this.remove()
  }

  document.documentElement.appendChild(pageScript)
}

export function destroy () {
  if (!pageScript) {
    return
  }

  pageScript.remove()
}
