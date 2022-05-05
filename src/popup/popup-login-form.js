import {render, html} from 'lit-html'

import Config from '../config.js'
import store from '../store/store-client.js'

customElements.define(
  'popup-login-form',
  class extends HTMLElement {
    constructor() {
      super()
      this.error = ''
      this.email = ''
      this.password = ''

      this.addEventListener('submit', (e) => {
        e.preventDefault()

        if (e.target.classList.contains('js-login-form')) {
          // cache form values before re-rendering
          this.email = e.target.querySelector('#login-email').value.trim()
          this.password = e.target.querySelector('#login-password').value.trim()

          this.error = ''
          this.loading = true
          this.connectedCallback()

          store.signin({
              email: this.email,
              password: this.password
            })
            .catch((response) => {
              this.loading = false

              const networkError = 'Could not connect to login server. Please try disabling your firewall or antivirus software and try again.'
              if (response && response.error) {
                const messages = [
                  {
                    status: 'auth/user-not-found',
                    message: `We couldn't find any users with that email address.`
                  },
                  {
                    status: 'auth/wrong-password',
                    message: 'Wrong email address or password.'
                  },
                  {
                    status: 'auth/network-request-failed',
                    message: networkError
                  }
                ]
                const error = messages.find((m) => response.error.includes(m.status))
                this.error = error ? error.message : response.error
              } else {
                this.error = networkError
              }

              return this.connectedCallback()
            })
        }
      })
    }
    connectedCallback() {
      render(html`
        <form class="popup-login-form text-start js-login-form">
          ${this.error ? html`
            <div class="alert alert-danger" role="alert">
                <p>${this.error}</p>
            </div>
          ` : ''}

          <div class="mb-3">
            <label for="login-email" class="form-label">
              Email
            </label>
            <input
              type="email"
              class="form-control"
              id="login-email"
              value=${this.email}
              required
            />
          </div>

          <div class="mb-3">
            <a
              href=${Config.functionsUrl}
              target="_blank"
              class="btn btn-link float-end btn-forgot"
              tabindex="-1"
              >
              Forgot password?
            </a>

            <label for="login-password" class="form-label">
                Password
            </label>
            <input
              type="password"
              class="form-control"
              id="login-password"
              value=${this.password}
              required
              />
          </div>

          <div class="text-center">
            <button
              type="submit"
              class=${`btn btn-primary btn-lg ${this.loading ? 'btn-loading' : ''}`}
              >
              Sign In
            </button>
          </div>
        </form>
      `, this)
    }
  }
)
