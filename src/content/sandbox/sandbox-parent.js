/* globals MANIFEST */
import browser from 'webextension-polyfill'

import {connect, request} from './sandbox-messenger-server.js'
import config from '../../config.js'

import {compileTemplate as sandboxCompile} from './sandbox.js'

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

function sendCompileMessage (template, context) {
  return request(config.eventSandboxCompile, {
    template: template,
    context: context,
  })
}

export async function compileTemplate (template = '', context = {}) {
  if (MANIFEST === '2') {
    return sandboxCompile(template, context)
  }

  if (!sandboxInstance) {
    // create the sandbox instance on first call
    sandboxInstance = document.createElement(sandboxTagName)
    return new Promise((resolve) => {
      sandboxInstance.onload = () => {
        sendCompileMessage(template, context).then(resolve)
      }
      document.documentElement.appendChild(sandboxInstance)
    })
  } else {
    return sendCompileMessage(template, context)
  }
}

export function destroy () {
  if (sandboxInstance) {
    sandboxInstance.remove()
  }
}
