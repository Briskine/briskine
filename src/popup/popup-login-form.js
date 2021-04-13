/* globals REGISTER_DISABLED */
import Config from '../config';
import store from '../store/store-client';

customElements.define(
    'popup-login-form',
    class extends HTMLElement {
        constructor() {
            super();
            this.error = '';
            this.email = '';
            this.password = '';

            this.addEventListener('submit', (e) => {
                e.preventDefault();

                if (e.target.classList.contains('js-login-form')) {
                    // cache form values before re-rendering
                    this.email = e.target.querySelector('#login-email').value.trim();
                    this.password = e.target.querySelector('#login-password').value.trim();

                    this.error = '';
                    this.loading = true;
                    this.connectedCallback();

                    store.signin({
                            email: this.email,
                            password: this.password
                        })
                        .catch((response) => {
                            this.loading = false;

                            if (response && response.error) {
                                this.error = response.error;
                            } else {
                                this.error = 'Could not connect to login server. Please try disabling your firewall or antivirus software and try again.';
                            }
                            return this.connectedCallback();
                        });
                }
            });
        }
        connectedCallback() {
            this.innerHTML = `
                <form class="popup-login-form text-left js-login-form">
                    ${this.error ? `
                        <div class="alert alert-danger" role="alert">
                            <p>${this.error}</p>
                        </div>
                    ` : ''}

                    <div class="form-group">
                        <label for="login-email">
                            Email
                        </label>
                        <input
                            type="email"
                            class="form-control"
                            id="login-email"
                            value="${this.email}"
                            required
                        />
                    </div>

                    <div class="form-group">
                        ${!REGISTER_DISABLED ? `
                        <a
                            href="${Config.functionsUrl}"
                            target="_blank"
                            class="btn btn-link float-right btn-forgot"
                            tabindex="-1"
                            >
                            Forgot password?
                        </a>
                        ` : ''}

                        <label for="login-password">
                            Password
                        </label>
                        <input
                            type="password"
                            class="form-control"
                            id="login-password"
                            value="${this.password}"
                            required
                            />
                    </div>

                    <div class="text-center">
                        <button
                            type="submit"
                            class="btn btn-primary btn-lg ${this.loading ? 'btn-loading' : ''}"
                            >
                            Sign In
                        </button>
                    </div>
                </form>
            `;
        }
    }
);
