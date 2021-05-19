/* globals REGISTER_DISABLED */
import Config from '../config';
import store from '../store/store-client';
import './popup-login-form';

customElements.define(
    'popup-login',
    class extends HTMLElement {
        constructor() {
            super();
            this.showLoginForm = false;

            const loadingClass = 'btn-loading';

            this.addEventListener('click', (e) => {
                if (e.target.classList.contains('js-signin')) {
                    e.target.classList.add(loadingClass);

                    // check session
                    store.getSession()
                        .then(() => {
                            // logged-in
                            e.target.classList.remove(loadingClass);
                            return;
                        })
                        .catch(() => {
                            // logged-out
                            // show login form
                            this.showLoginForm = true;
                            this.connectedCallback();
                        });
                }
            });
        }
        connectedCallback() {
            const logoImg = '<img src="../icons/briskine-wordmark.svg" width="120" alt="Briskine"/>'

            this.innerHTML = `
                <div class="popup-login text-center">
                    <div class="popup-box popup-logo">
                        ${!REGISTER_DISABLED ? `
                            <a href="${Config.websiteUrl}" target="_blank">
                                ${logoImg}
                            </a>
                        ` : logoImg}
                    </div>

                    <div class="popup-box">
                        ${this.showLoginForm ? `
                            <popup-login-form></popup-login-form>
                        ` : `
                            <p>
                                <strong>
                                    Sign In to access your templates.
                                </strong>
                            </p>

                            <button type="button" class="js-signin btn btn-primary btn-lg">
                                Sign In
                            </button>
                        `}
                    </div>

                    ${!REGISTER_DISABLED ? `
                        <div class="popup-box text-muted">
                            <small>
                                Don't have an account yet?
                                <br>
                                <a href="${Config.websiteUrl}/signup" target="_blank">
                                    Create a free account
                                </a>
                            </small>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }
);
