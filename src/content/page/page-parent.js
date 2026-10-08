/* globals chrome, browser */
import Messenger from '../messenger/messenger.js'

let pageMessengerServer
let pageScript

// for page.js to load and answer
const connectTimeout = 3000

// throws when page.js is not available,
// so the editors fall back to execCommand.
export function request (type, options) {
  if (!pageMessengerServer) {
    throw new Error('page.js is not available')
  }

  return pageMessengerServer.request(type, options)
}

// eg. the proton mail composer
function isScriptlessSandbox () {
  const frame = window.frameElement
  // frame elements don't support sandbox
  return Boolean(frame?.sandbox && frame.hasAttribute('sandbox') && !frame.sandbox.contains('allow-scripts'))
}

export async function setup () {
  // script already loaded
  if (pageScript) {
    return
  }

  // page.js is blocked, editors fall back to execCommand
  if (isScriptlessSandbox()) {
    return
  }

  let resolve, reject
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })

  const script = document.createElement('script')
  pageScript = script
  const path = (chrome || browser).runtime.getURL('page/page.js')
  // cache bust to force the browser to reload the es module
  script.src = path + `?v=${Date.now()}`
  script.type = 'module'
  script.onload = async function () {
    script.remove()
    // create the message channel when the iframe loads,
    // for subsequent startup retries (eg. in dynamically created iframes).
    const server = Messenger('page')
    await server.connect(window)
    // can answer after the timeout, use it if we're still the current script
    if (pageScript === script) {
      pageMessengerServer = server
    }
    resolve()
  }
  script.onerror = function (err) {
    script.remove()
    reject(err)
  }

  document.documentElement.appendChild(script)

  // load also fires when the script was blocked from running,
  // and nothing answers the handshake. or neither load nor error fires.
  let timer
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error('page.js did not answer')), connectTimeout)
  })

  try {
    await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

export function destroy () {
  pageScript = null
  pageMessengerServer = null
}
