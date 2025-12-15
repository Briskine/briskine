/* globals chrome, browser */
import Messenger from '../messenger/messenger.js'

let pageMessengerServer
let pageScript

export function request (type, options) {
  return pageMessengerServer.request(type, options)
}

export function setup () {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })

  pageScript = document.createElement('script')
  pageScript.src = (chrome || browser).runtime.getURL('page/page.js')
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

export function destroy () {
  if (!pageScript) {
    return
  }

  pageScript.remove()
}
