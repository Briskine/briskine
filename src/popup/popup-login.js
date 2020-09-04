import Config from '../background/js/config';

customElements.define(
    'popup-login',
    class extends HTMLElement {
        constructor() {
            super();

            this.addEventListener('click', (e) => {
                if (e.target.classList.contains('js-signin')) {
                    chrome.runtime.openOptionsPage();
                }
            });
        }
        connectedCallback() {
            this.innerHTML = `
                <div class="popup-login">
                    <div class="popup-box text-center">
                        <a href="${Config.websiteUrl}" target="_blank">
                            <img src="../icons/templates-logotype.png" alt="Gorgias Templates"/>
                        </a>
                    </div>

                    <div class="popup-box text-center">
                        <p>
                            <strong>
                                Sign in to access your templates.
                            </strong>
                        </p>

                        <button type="button" class="btn btn-primary js-signin">
                            Sign In
                        </button>

                        <p class="text-muted">
                            <small>
                                Don't have an account yet?
                                <br>
                                <a href="${Config.websiteUrl}/signup" target="_blank">
                                    Create a free account
                                </a>
                            </small>
                        </p>
                    </div>
                </div>
            `;
        }
    }
);
