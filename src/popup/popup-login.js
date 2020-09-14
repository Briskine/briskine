import Config from '../background/js/config';

customElements.define(
    'popup-login',
    class extends HTMLElement {
        constructor() {
            super();

            this.addEventListener('click', (e) => {
                if (e.target.classList.contains('js-signin')) {
                    // TODO check session first, then redirect to login
                    chrome.runtime.openOptionsPage();
                }
            });
        }
        connectedCallback() {
            this.innerHTML = `
                <div class="popup-login text-center">
                    <div class="popup-box popup-logo">
                        <a href="${Config.websiteUrl}" target="_blank">
                            <img src="../icons/templates-logotype.png" alt="Gorgias Templates"/>
                        </a>
                    </div>

                    <div class="popup-box">
                        <p>
                            <strong>
                                Sign In to access your templates.
                            </strong>
                        </p>

                        <button type="button" class="js-signin btn btn-primary btn-lg btn-login">
                            Sign In
                        </button>
                    </div>

                    <div class="popup-box text-muted">
                        <small>
                            Don't have an account yet?
                            <br>
                            <a href="${Config.websiteUrl}/signup" target="_blank">
                                Create a free account
                            </a>
                        </small>
                    </div>
                </div>
            `;
        }
    }
);
