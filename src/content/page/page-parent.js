/* globals chrome, browser */
import Messenger from '../messenger/messenger.js'

let pageMessengerServer
let pageScript

export function request (type, options) {
  return pageMessengerServer.request(type, options)
}

export async function setup () {
  // messenger already connected
  if (pageMessengerServer) {
    return
  }

  // pageScript may be set but stale (e.g. the element was removed by document.write
  // before it could load, so onload never fired and pageMessengerServer was never set).
  // Reset it so we reinject the script.
  pageScript = null

  let resolve, reject
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })

  pageScript = document.createElement('script')
  pageScript.src = (chrome || browser).runtime.getURL('page/page.js')
  pageScript.type = 'module'
  pageScript.onload = async function () {
    // create the message channel when the iframe loads,
    // for subsequent startup retries (eg. in dynamically created iframes).
    pageMessengerServer = Messenger('page')
    await pageMessengerServer.connect(window)
    this.remove()
    resolve()
  }
  pageScript.onerror = function (err) {
    reject(err)
  }

  document.documentElement.appendChild(pageScript)

  return promise
}
