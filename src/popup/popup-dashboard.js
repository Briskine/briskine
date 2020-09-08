import Config from '../background/js/config';
import store from '../store/store-client';

const optionsUrl = chrome.extension.getURL('pages/options.html');
const optionsTarget = 'gt-options';

function niceTime (minutes) {
    if (!minutes) {
        return "0min";
    }
    if (minutes < 60) {
        return minutes + "min";
    }
    // 23h and 23m
    if (minutes < 60 * 24) {
        return Math.floor(minutes / 60) + "h and " + minutes % 60 + "min";
    } else {
        return Math.floor(minutes / (60 * 24)) + "d, " + Math.floor(minutes % (60 * 24) / 60) + "h and " + minutes % (60 * 24) % 60 + "min";
    }
}

function getStats () {
    const avgWPM = 25;
    return store.getSettings({
            key: 'words',
            def: 0
        })
        .then((words) => {
            // average WPM: http://en.wikipedia.org/wiki/Words_per_minute
            const time = niceTime(Math.round(words / avgWPM));

            return {
                time: time,
                words: words
            };
        });
}

customElements.define(
    'popup-dashboard',
    class extends HTMLElement {
        constructor() {
            super();

            this.stats = {
                time: '0min',
                words: 0
            };

            // TODO isFree
            // TODO user email for rendering

            getStats().then((res) => {
                this.stats = res;
                this.connectedCallback();
            });

            this.addEventListener('click', (e) => {
                if (e.target.classList.contains('js-logout')) {
                    store.logout();
                }
            });
        }
        connectedCallback() {
            this.innerHTML = `
                <div class="popup-dashboard">
                    <div class="popup-box">
                        <a href="${Config.websiteUrl}" target="_blank">
                            <img src="../icons/templates-logotype.png" alt="Gorgias Templates"/>
                        </a>
                    </div>

                    <ul class="list-unstyled">
                        <li>
                            <a href="${optionsUrl}#/list?id=new&src=popup" target="${optionsTarget}">
                                New template
                            </a>
                        </li>
                        <li>
                            <a href="${optionsUrl}" target="${optionsTarget}">
                                Manage templates
                            </a>
                        </li>
                        <li>
                            <a href="${optionsUrl}#/settings" target="${optionsTarget}">
                                Settings
                            </a>
                        </li>
                    </ul>

                    <div class="popup-box popup-stats">
                        <p>
                            You saved <strong>${this.stats.time}</strong> using Gorgias Templates!
                        </p>

                        <p>
                        ${this.stats.words < 1500 ? `Big things have small beginnings &#128170;` : ''}
                        ${this.stats.words > 1500 && this.stats.words < 2500 ? `Or the equivalent of writing a short story &#128214;` : ''}
                        ${this.stats.words >= 2500 && this.stats.words < 7500 ? `Did you know mushrooms are one of the largest organisms in the world? &#127812;` : ''}
                        ${this.stats.words >= 7500 ? `You're awesome. Just awesome. &#9996;` : ''}
                        </p>

                        <p>
                            Go Premium to get
                            Unlimited Templates
                            and
                            Template Sharing.
                        </p>

                        <a href="${optionsUrl}#/account/subscriptions" target="${optionsTarget}" class="btn btn-primary">
                            Upgrade to Premium
                        </a>
                    </div>

                    <div class="popup-box">
                        user@email.com

                        <button type="button" class="js-logout">
                            Log out
                        </button>
                    </div>
                </div>
            `;
        }
    }
);
