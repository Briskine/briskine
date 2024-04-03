/* globals MANIFEST */
import browser from 'webextension-polyfill'

import {compileTemplate as sandboxCompile} from './sandbox.js'
import config from '../../config.js'

let sandboxInstance = null
const sandboxTagName = `b-sandbox-${Date.now().toString(36)}`

const channel = new MessageChannel()
const port1 = channel.port1

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
      iframe.onload = () => {
        iframe.contentWindow.postMessage({ type: 'init' }, '*', [channel.port2])
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

    function handleCompileMessage (e) {
      if (e.data.type === config.eventSandboxCompile) {
        port1.onmessage = () => {}
        return resolve(e.data.template)
      }
    }

    port1.onmessage = handleCompileMessage

    function sendCompileMessage () {
      port1.postMessage({
        type: config.eventSandboxCompile,
        template: template,
        context: context,
      })
    }

    if (!sandboxInstance) {
      // create the sandbox instance on first call
      sandboxInstance = document.createElement(sandboxTagName)
      sandboxInstance.onload = sendCompileMessage
      document.documentElement.appendChild(sandboxInstance)
    } else {
      sendCompileMessage()
    }
  })
}

export function destroy () {
  if (sandboxInstance) {
    sandboxInstance.remove()
  }
}
