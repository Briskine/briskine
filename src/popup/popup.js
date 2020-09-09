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

            store.on('logout', () => {
                this.checkLogin();
            });
        }
        checkLogin() {
            return store.getLoginInfo()
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
                <div class="popup-container">
                    ${this.loggedIn === true ? `<popup-dashboard></popup-dashboard>` : ''}
                    ${this.loggedIn === false ? `<popup-login></popup-login>` : ''}
                </div>
            `;
        }
    }
);
