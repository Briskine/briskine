/* globals MANIFEST */
import browser from 'webextension-polyfill'

import {compileTemplate as sandboxCompile} from './sandbox.js'
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

export function compileTemplate (template = '', context = {}) {
  return new Promise((resolve) => {
    if (MANIFEST === '2') {
      return resolve(sandboxCompile(template, context))
    }

    function sendCompileMessage () {
      return request(config.eventSandboxCompile, {
        template: template,
        context: context,
      })
    }

    if (!sandboxInstance) {
      // create the sandbox instance on first call
      sandboxInstance = document.createElement(sandboxTagName)
      sandboxInstance.onload = () => {
        sendCompileMessage().then(resolve)
      }
      document.documentElement.appendChild(sandboxInstance)
    } else {
      resolve(sendCompileMessage())
    }
  })
}

export function destroy () {
  if (sandboxInstance) {
    sandboxInstance.remove()
  }
}
