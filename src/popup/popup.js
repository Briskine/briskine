/* global URLSearchParams, REGISTER_DISABLED */
import './popup.css';

import './popup-login';
import './popup-dashboard';
import store from '../store/store-client';

customElements.define(
    'popup-container',
    class extends HTMLElement {
        constructor() {
            super();
            this.loggedIn = null;

            this.checkLogin();

            store.on('login', () => {
                // close window when the popup is opened as a new tab, not browser action.
                // eg. opened from the dialog
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('source') === 'tab') {
                    return window.close();
                }

                return this.checkLogin();
            });
            store.on('logout', () => this.checkLogin());
        }
        checkLogin() {
            return store.getAccount()
                .then(() => {
                    this.loggedIn = true;
                    return;
                })
                .catch(() => {
                    this.loggedIn = false;
                    return;
                })
                .then(() => {
                    return this.connectedCallback();
                });
        }
        connectedCallback() {
            this.innerHTML = `
                <div class="popup-container ${REGISTER_DISABLED ? 'popup-register-disabled' : ''}">
                    ${this.loggedIn === true ? `<popup-dashboard></popup-dashboard>` : ''}
                    ${this.loggedIn === false ? `<popup-login></popup-login>` : ''}
                </div>
            `;
        }
    }
);
