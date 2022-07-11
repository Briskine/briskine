/* globals chrome, browser */
import config from '../../config.js'

const channel = new MessageChannel()
const port1 = channel.port1

let pageScript

export function sendToPage (data = {}) {
  return new Promise((resolve) => {
    function handlePageMessage (e) {
      if (e.data.type === config.eventPage) {
        port1.onmessage = () => {}
        return resolve(data)
      }
    }

    port1.onmessage = handlePageMessage
    port1.postMessage(data)
  })

}

export function setup () {
  pageScript = document.createElement('script')
  pageScript.src = (chrome || browser).runtime.getURL('page/page.js')
  pageScript.onload = function () {
    window.postMessage({ type: 'page-init' }, '*', [channel.port2])
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
