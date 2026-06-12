import browser from 'webextension-polyfill'

import {connect, request} from './sandbox-messenger-server.js'
import { eventSandboxCompile } from '../../config.js'

let sandboxInstance = null
let sandboxReady = null
let sandboxFailed = false
const sandboxTagName = `b-sandbox-${Date.now().toString(36)}`

// hard ceiling on how long we wait for the sandbox iframe to come up.
// the messenger handshake itself retries for ~1s, so 3s leaves enough headroom
// for slow page loads while still preventing forever-hangs in browsers that
// refuse to load the sandbox iframe (eg. some Chromium 149 builds).
const SANDBOX_INIT_TIMEOUT_MS = 3000
// per-compile timeout for the actual handlebars work.
const SANDBOX_COMPILE_TIMEOUT_MS = 5000

function withTimeout (promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

customElements.define(
  sandboxTagName,
  class extends HTMLElement {
    constructor() {
      super()

      this.onload = () => {}
      this.onerror = () => {}
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
        try {
          await connect(iframe.contentWindow)
          this.onload()
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Briskine] sandbox messenger connection failed.', err)
          this.onerror(err)
        }
      }
      shadowRoot.appendChild(iframe)
    }
  }
)

// fallback used when the sandbox cannot be reached (eg. Brave/Chromium 149
// refuses to load the extension sandbox iframe, or the handshake never
// completes). callers receive an exception and are expected to fall back to
// returning the raw template body so that *something* renders.
function sendCompileMessage (template, context, partials) {
  return request(eventSandboxCompile, {
    template: template,
    context: context,
    partials: partials,
  })
}

export async function compileTemplate (template = '', context = {}, partials = []) {
  if (sandboxFailed) {
    throw new Error('[Briskine] sandbox previously failed')
  }

  if (!sandboxInstance) {
    sandboxInstance = document.createElement(sandboxTagName)
    sandboxReady = new Promise((resolve, reject) => {
      sandboxInstance.onload = () => {
        resolve()
      }
      sandboxInstance.onerror = (err) => {
        reject(err)
      }
      document.documentElement.appendChild(sandboxInstance)
    })
  }

  try {
    // hard timeout on the iframe handshake. the messenger has its own retry
    // loop, but if the iframe itself never loads we'd hang forever otherwise.
    await withTimeout(sandboxReady, SANDBOX_INIT_TIMEOUT_MS, '[Briskine] sandbox init')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Briskine] sandbox init failed:', err.message || err)
    sandboxFailed = true
    throw err
  }

  try {
    return await withTimeout(
      sendCompileMessage(template, context, partials),
      SANDBOX_COMPILE_TIMEOUT_MS,
      '[Briskine] sandbox compile'
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Briskine] sandbox compile failed:', err.message || err)
    sandboxFailed = true
    throw err
  }
}

export function destroy () {
  if (sandboxInstance) {
    sandboxInstance.remove()
    sandboxInstance = null
    sandboxReady = null
    sandboxFailed = false
  }
}
