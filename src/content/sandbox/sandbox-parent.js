import browser from 'webextension-polyfill'

import config from '../../config.js'

let sandboxInstance = null
const sandboxTagName = `b-sandbox-${Date.now()}`

customElements.define(
  sandboxTagName,
  class extends HTMLElement {
    constructor() {
      super()
    }
    connectedCallback () {
      if (!this.isConnected) {
        return
      }

      const iframe = document.createElement('iframe')
      iframe.src = browser.runtime.getURL('sandbox.html')
      iframe.style.display = 'none'

      const shadowRoot = this.attachShadow({mode: 'closed'})
      shadowRoot.appendChild(iframe)

      this.postMessage = (data = {}) => {
        iframe.contentWindow.postMessage(data, '*')
      }
    }
    disconnectedCallback () {
      window.removeEventListener('message', this.respond)
    }
  }
)

export function compileTemplate (template = '', context = {}) {
  return new Promise((resolve) => {
    // TODO see if we can prevent other message handlers from getting the message
    function handleCompileMessage (e) {
      if (e.data.type === config.eventSandboxCompile) {
        window.removeEventListener('message', handleCompileMessage)
        return resolve(e.data.template)
      }
    }
    window.addEventListener('message', handleCompileMessage)

    sandboxInstance.postMessage({
      type: config.eventSandboxCompile,
      template: template,
      context: context
    })
  })
}

export function setup () {
  sandboxInstance = document.createElement(sandboxTagName)
  document.documentElement.appendChild(sandboxInstance)
}

export function destroy () {
  if (!sandboxInstance) {
    return
  }

  sandboxInstance.remove()
}
