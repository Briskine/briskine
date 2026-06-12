/* globals chrome, browser */
import Messenger from '../messenger/messenger.js'

let pageMessengerServer
let pageScript

export function request (type, options) {
  return pageMessengerServer.request(type, options)
}

export async function setup () {
  // script already loaded
  if (pageScript) {
    return
  }

  let resolve, reject
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })

  pageScript = document.createElement('script')
  const path = (chrome || browser).runtime.getURL('page/page.js')
  // cache bust to force the browser to reload the es module
  pageScript.src = path + `?v=${Date.now()}`
  pageScript.type = 'module'
  pageScript.onload = async function () {
    // create the message channel when the script loads,
    // for subsequent startup retries (eg. in dynamically created iframes).
    pageMessengerServer = Messenger('page')
    try {
      await pageMessengerServer.connect(window)
    } catch (err) {
      reject(err)
      return
    }
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
  pageScript = null
}
