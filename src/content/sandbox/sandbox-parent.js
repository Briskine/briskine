import browser from 'webextension-polyfill'

import {connect, request} from './sandbox-messenger-server.js'
import config from '../../config.js'

let sandboxInstance = null
const sandboxTagName = `b-sandbox-${Date.now().toString(36)}`

customElements.define(
  sandboxTagName,
  class extends HTMLElement {
    constructor() {
      super()

      this.onload = () => {}
    }
    connectedCallback () {
      if (!this.isConnected) {
        return
      }

      const shadowRoot = this.attachShadow({mode: 'closed'})
      const iframe = document.createElement('iframe')
      iframe.credentialless = true
      iframe.src = browser.runtime.getURL('sandbox/sandbox.html')
      iframe.style.display = 'none'
      iframe.onload = async () => {
        await connect(iframe.contentWindow)
        this.onload()
      }
      shadowRoot.appendChild(iframe)
    }
  }
)

function sendCompileMessage (template, context, partials) {
  return request(config.eventSandboxCompile, {
    template: template,
    context: context,
    partials: partials,
  })
}

export async function compileTemplate (template = '', context = {}, partials = []) {
  if (!sandboxInstance) {
    // create the sandbox instance on first call
    sandboxInstance = document.createElement(sandboxTagName)
    return new Promise((resolve) => {
      sandboxInstance.onload = () => {
        sendCompileMessage(template, context, partials).then(resolve)
      }
      document.documentElement.appendChild(sandboxInstance)
    })
  } else {
    return sendCompileMessage(template, context, partials)
  }
}

export function destroy () {
  if (sandboxInstance) {
    sandboxInstance.remove()
  }
}
