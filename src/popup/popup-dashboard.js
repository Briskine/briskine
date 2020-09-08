import Config from '../background/js/config';
import store from '../store/store-client';

import {plusSquare, clone, cog} from './popup-icons';

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
            getStats().then((res) => {
                this.stats = res;
                this.connectedCallback();
            });

            this.user = {};
            this.isFree = null;
            store.getAccount().then((res) => {
                this.user = res;
                this.isFree = this.user.current_subscription.plan === 'free';

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
                    <div class="popup-box popup-logo">
                        <a href="${Config.websiteUrl}" target="_blank">
                            <img src="../icons/templates-logotype.png" alt="Gorgias Templates"/>
                        </a>
                    </div>

                    <ul class="list-unstyled popup-menu">
                        <li>
                            <a href="${optionsUrl}#/list?id=new&src=popup" target="${optionsTarget}">
                                <span class="icon">${plusSquare}</span>
                                New template
                            </a>
                        </li>
                        <li>
                            <a href="${optionsUrl}" target="${optionsTarget}">
                                <span class="icon">${clone}</span>
                                Manage templates
                            </a>
                        </li>
                        <li>
                            <a href="${optionsUrl}#/settings" target="${optionsTarget}">
                                <span class="icon">${cog}</span>
                                Settings
                            </a>
                        </li>
                    </ul>

                    <div class="popup-box popup-stats">
                        <p>
                            You saved <strong>${this.stats.time}</strong> using Gorgias Templates!
                        </p>

                        ${this.isFree === false ? `
                            <p class="popup-quote">
                                ${this.stats.words < 1500 ? `Big things have small beginnings &#128170;` : ''}
                                ${this.stats.words > 1500 && this.stats.words < 2500 ? `Or the equivalent of writing a short story &#128214;` : ''}
                                ${this.stats.words >= 2500 && this.stats.words < 7500 ? `Did you know mushrooms are one of the largest organisms in the world? &#127812;` : ''}
                                ${this.stats.words >= 7500 ? `You're awesome. Just awesome. &#9996;` : ''}
                            </p>
                        ` : ''}

                        ${this.isFree === true ? `
                            <p>
                                Go Premium to get
                                Unlimited Templates
                                and
                                Template Sharing.
                            </p>

                            <a href="${optionsUrl}#/account/subscriptions" target="${optionsTarget}" class="btn btn-primary">
                                Upgrade to Premium
                            </a>
                        ` : ''}
                    </div>

                    <div class="popup-box popup-status">
                        <a href="${optionsUrl}#/account" target="${optionsTarget}" class="popup-user">
                            ${this.user.email}
                        </a>

                        <button type="button" class="js-logout btn btn-link btn-logout">
                            Log out
                        </button>
                    </div>
                </div>
            `;
        }
    }
);
