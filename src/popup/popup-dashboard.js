import Config from '../config';
import store from '../store/store-client';

import {plusSquare, clone, cog} from './popup-icons';

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
                            <img src="../icons/briskine-wordmark.svg" width="100" alt="Briskine"/>
                        </a>
                    </div>

                    <ul class="list-unstyled popup-menu">
                        <li>
                            <a href="${Config.functionsUrl}/#/list?id=new&src=popup" target="${Config.dashboardTarget}">
                                <span class="icon">${plusSquare}</span>
                                New template
                            </a>
                        </li>
                        <li>
                            <a href="${Config.functionsUrl}" target="${Config.dashboardTarget}">
                                <span class="icon">${clone}</span>
                                Manage templates
                            </a>
                        </li>
                        <li>
                            <a href="${Config.functionsUrl}/#/settings" target="${Config.dashboardTarget}">
                                <span class="icon">${cog}</span>
                                Settings
                            </a>
                        </li>
                    </ul>

                    <div class="popup-box popup-stats">
                        ${this.stats.time !== '0min' ? `
                            <p>
                                You saved <strong>${this.stats.time}</strong> using Briskine!
                            </p>
                        ` : ''}

                        ${this.isFree === false ? `
                            <p>
                                ${this.stats.words < 1500 ? `
                                    <span class="font-italic">Big things have small beginnings</span> &#128170;
                                ` : ''}
                                ${this.stats.words > 1500 && this.stats.words < 2500 ? `
                                    <span class="font-italic">Or the equivalent of writing a short story</span> &#128214;
                                ` : ''}
                                ${this.stats.words >= 2500 && this.stats.words < 7500 ? `
                                    <span class="font-italic">Did you know mushrooms are one of the largest organisms in the world?</span> &#127812;
                                ` : ''}
                                ${this.stats.words >= 7500 ? `
                                    <span class="font-italic">You're awesome. Just awesome.</span> &#9996;
                                ` : ''}
                            </p>
                        ` : ''}

                        ${this.isFree === true ? `
                            <p class="label-upgrade">
                                Go Premium to get
                                Unlimited Templates
                                and
                                Template Sharing.
                            </p>

                            <a href="${Config.functionsUrl}/#/account/subscriptions" target="${Config.dashboardTarget}" class="btn btn-success btn-upgrade">
                                Upgrade to Premium
                            </a>
                        ` : ''}
                    </div>

                    <div class="popup-box popup-status">
                        <a href="${Config.functionsUrl}/#/account" target="${Config.dashboardTarget}" class="popup-user" title="Account Settings for ${this.user.email}">
                            ${this.user.email}
                        </a>
                        ${this.isFree === false ? `
                            <span class="label-premium">
                                Premium
                            </span>
                        ` : ''}

                        <button type="button" class="js-logout btn btn-link btn-logout">
                            Log out
                        </button>
                    </div>
                </div>
            `;
        }
    }
);
