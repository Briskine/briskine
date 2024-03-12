/* global REGISTER_DISABLED */
import {html, render} from 'lit-html'

import './popup.css'

import './popup-login.js'
import './popup-dashboard.js'
import store from '../store/store-client.js'
import setTheme from './popup-theme.js'

customElements.define(
  'popup-container',
  class extends HTMLElement {
    constructor() {
      super()
      setTheme()

      this.loggedIn = null
      this.checkLogin()

      store.on('login', () => {
        // close window when the popup is opened as a new tab, not browser action.
        // eg. opened from the dialog
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('source') === 'tab') {
            return window.close()
        }

        return this.checkLogin()
      })
      store.on('logout', () => this.checkLogin())
    }
    checkLogin() {
      return store.getAccount()
        .then(() => {
          this.loggedIn = true
          return
        })
        .catch(() => {
          this.loggedIn = false
          return
        })
        .then(() => {
          return this.connectedCallback()
        })
    }
    connectedCallback() {
      render(html`
        <div
          class=${`popup-container ${REGISTER_DISABLED ? 'popup-register-disabled' : ''}`}
          >
            ${this.loggedIn === true ? html`<popup-dashboard></popup-dashboard>` : ''}
            ${this.loggedIn === false ? html`<popup-login></popup-login>` : ''}
        </div>
      `, this)
    }
  }
)
