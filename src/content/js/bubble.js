/**
 * Bubble.
 * Floating action button.
 */

import dialog from './dialog';
import store from '../../store/store-client';

let activeTextfield = null;
let bubbleInstance = null;
const dialogSelector = '.qt-dropdown';

customElements.define(
    'b-bubble',
    class extends HTMLElement {
        constructor() {
            super();

            this.ready = false;
            this.bubbleVisibilityTimer = null;
        }
        connectedCallback () {
            // element was already created,
            // just moved around in the dom.
            if (this.ready) {
                return;
            }

            // dialog shortcut
            const shortcut = this.getAttribute('shortcut') || 'ctrl+space';

            const template = `
                <style>
                    :host,
                    :host * {
                        box-sizing: border-box;
                    }

                    :host {
                        position: absolute;
                        z-index: 2147483647;
                        display: block;

                        --bubble-size: 28px;
                        --bubble-margin: 5px;
                        width: var(--bubble-size);
                        height: var(--bubble-size);
                        margin: var(--bubble-margin);

                        font-family: sans-serif;
                    }

                    .b-bubble {
                        opacity: 0;
                        visibility: hidden;
                        transition: opacity ease-out .2s;

                        appearance: none;
                        display: block;
                        width: 100%;
                        height: 100%;
                        padding: 5px;
                        background-color: rgba(243, 244, 245, .4);
                        border: 0;
                        border-radius: 5px;
                        cursor: pointer;
                    }

                    .b-bubble:hover {
                        background-color: #e9eaec;
                        box-shadow: 0 0 12px rgba(0,0,0,.1);
                    }

                    .b-bubble:active {
                        box-shadow: none;
                    }

                    .b-bubble:after {
                        content: '';
                        position: relative;
                        top: 0;
                        left: 0;
                        display: block;
                        height: 100%;
                        width: 100%;

                        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="29mm" height="38mm" viewBox="0 0 29 38"><path d="M14.19269 0c3.68786 0 6.68658.81961 8.99614 2.45882 2.30957 1.60196 3.46435 4.32157 3.46435 8.15883 0 1.41568-.33525 2.70098-1.00577 3.85588-.63327 1.11765-1.47142 2.08628-2.51446 2.90588 1.71356.89412 3.11047 2.1049 4.19076 3.63236C28.44124 22.53922 29 24.47647 29 26.82353c0 3.50196-1.22928 6.24019-3.68786 8.21471C22.89083 37.01275 19.64998 38 15.58961 38H.00002V0z" fill="%230607fb"/><path d="M.00001.00006v20.05518A20.240457 20.242517 0 0011.0152 23.3153a20.240457 20.242517 0 0013.46005-5.12465c-.42371-.29411-.87062-.56515-1.34231-.81128 1.04303-.8196 1.88128-1.78812 2.51454-2.90576.67053-1.15491 1.00581-2.44016 1.00581-3.85584 0-3.83725-1.15493-6.55709-3.4645-8.15906C20.87921.8195 17.88043.00006 14.19258.00006z" fill="%230983fa"/></svg>') no-repeat center center;
                        background-size: contain;
                    }

                    .b-bubble-visible {
                        opacity: .7;
                        visibility: visible;
                    }

                    .b-bubble:hover + .b-bubble-tooltip {
                        opacity: 1;
                        visibility: visible;
                        transition-delay: 1s;
                    }

                    .b-bubble-tooltip {
                        --tooltip-bg: #2a2a2a;
                        visibility: hidden;
                        opacity: 0;
                        transition: opacity ease-in .1s;

                        position: absolute;
                        top: 50%;
                        left: 0;
                        padding: 3px 5px;
                        background: var(--tooltip-bg);
                        border-radius: 2px;

                        color: #fff;
                        font-size: 11px;
                        font-weight: bold;
                        line-height: 1;
                        white-space: nowrap;

                        transform: translate(-100%, -50%);
                        margin-left: -12px;
                    }

                    .b-bubble-tooltip:after {
                        content: '';
                        position: absolute;
                        border-style: solid;
                        border-color: transparent;
                        border-width: 6px;
                        border-left-color: var(--tooltip-bg);
                        display: block;
                        width: 0;
                        z-index: 1;
                        top: 0;
                        right: 1px;
                        transform: translate(100%, calc(50% - 3px));
                    }

                    /* RTL support
                     * BUG dialog positioning is broken in rtl mode,
                     * after clicking the button.
                     */
                    :host([dir=rtl]) {
                        right: auto !important;
                        left: 0;
                    }

                    :host([dir=rtl]) .b-bubble-tooltip {
                        transform: translate(var(--bubble-size), -50%);
                        margin-left: 12px;
                    }

                    :host([dir=rtl]) .b-bubble-tooltip:after {
                        left: 1px;
                        right: auto;
                        border-left-color: transparent;
                        border-right-color: var(--tooltip-bg);
                        transform: translate(-100%, calc(50% - 3px));
                    }

                </style>
                <button type="button" class="b-bubble"></button>
                <span class="b-bubble-tooltip">
                    Search templates (${shortcut})
                </div>
            `;
            const shadowRoot = this.attachShadow({mode: 'open'});
            shadowRoot.innerHTML = template;

            this.$button = this.shadowRoot.querySelector('.b-bubble');
            this.$button.addEventListener('mousedown', (e) => {
                // prevent stealing focus when clicking the button
                e.preventDefault();
            });
            this.$button.addEventListener('click', (e) => {
                // position the dialog under the qa button.
                // since the focus node is now the button
                // we have to pass the previous focus (the text node).
                dialog.completion(e, {
                    focusNode: activeTextfield,
                    dialogPositionNode: e.target,
                    source: 'button'
                });
            });

            this.ready = true;
        }
        attributeChangedCallback (name, oldValue, newValue) {
            if (name === 'visible') {
                const visibleClassName = 'b-bubble-visible';

                if (this.bubbleVisibilityTimer) {
                    clearTimeout(this.bubbleVisibilityTimer);
                }

                // timer makes the visible/not-visible state to be less "flickery"
                // when rapidly focusing and blurring textfields,
                // and makes the transitions be visible.
                this.bubbleVisibilityTimer = setTimeout(() => {
                    if (newValue === 'true') {
                        this.$button.classList.add(visibleClassName);
                    } else {
                        this.$button.classList.remove(visibleClassName);
                    }
                }, 200);
            }

            if (name === 'top' || name === 'right') {
                this.style[name] = `${newValue}px`;
            }
        }
        static get observedAttributes() {
            return [
                'visible',
                'top',
                'right'
            ];
        }
    }
);

export function setup () {
    // if bubble is enabled in settings
    store.getSettings({
        key: 'settings'
    }).then((settings) => {
        if (settings.qaBtn && settings.qaBtn.enabled === false) {
            return;
        }

        // if bubble is enabled in dom
        if (bubbleEnabled()) {
            return create(settings);
        }

        const domObserver = new MutationObserver((records, observer) => {
            if (bubbleEnabled()) {
                observer.disconnect();
                create(settings);
            }
        });
        domObserver.observe(document.body, {
            attributes: true
        });
    });
}

function create (settings = {}) {
    // bubble is created outside the body.
    // when textfields are focused, move it to the offsetParent for positioning.
    bubbleInstance = document.createElement('b-bubble');
    // custom dialog shortcut
    if (settings.dialog && settings.dialog.shortcut) {
        bubbleInstance.setAttribute('shortcut', settings.dialog.shortcut);
    }
    document.documentElement.appendChild(bubbleInstance);

    document.addEventListener('focusin', (e) => {
        // used for showing the dialog completion
        activeTextfield = e.target;

        return showBubble(e.target, settings);
    });

    document.addEventListener('focusout', (e) => {
        // don't hide the bubble if the newly focused node is in the dialog.
        // eg. when clicking the bubble.
        if (e.relatedTarget && e.relatedTarget.closest(dialogSelector)) {
            return;
        }

        return hideBubble();
    });

    // re-position bubble on scroll
    let scrollTick = false;
    document.addEventListener('scroll', (e) => {
        if (!scrollTick) {
            window.requestAnimationFrame(() => {
                if (
                    e.target &&
                    e.target.contains(activeTextfield) &&
                    bubbleInstance &&
                    bubbleInstance.getAttribute('visible') === 'true'
                ) {
                    bubbleInstance.setAttribute('top', activeTextfield.offsetTop + e.target.scrollTop);
                }

                scrollTick = false;
            });

            scrollTick = true;
        }
    }, true);
}

function isValidTextfield (elem) {
    // if the element is a textfield
    if (elem.matches('textarea, input[type=text], [contenteditable]')) {
        // check if the element is big enough
        // to only show the bubble for large textfields
        const metrics = elem.getBoundingClientRect();
        if (metrics.width > 100 && metrics.height > 30) {
            return true;
        }
    }

    return false;
}

// finds the first offsetParent that could be scrollable
function findScrollParent (target) {
    const parent = target.offsetParent;
    if (!parent) {
        return null;
    }
    const parentStyles = window.getComputedStyle(parent);

    if (
        parentStyles.overflow === 'scroll' ||
        parentStyles.overflow === 'auto'
    ) {
        return parent;
    }

    return findScrollParent(parent);
}

function showBubble (textfield, settings) {
   // only show it for valid elements
    if (!isValidTextfield(textfield)) {
        return false;
    }

    // detect rtl
    const textfieldStyles = window.getComputedStyle(textfield);
    const direction = textfieldStyles.direction || 'ltr';
    bubbleInstance.setAttribute('dir', direction);

    // scroll positioning
    const offsetParent = textfield.offsetParent;
    let scrollTop = 0;
    const scrollParent = findScrollParent(textfield);
    if (scrollParent) {
        scrollTop = scrollParent.scrollTop;
    }

    if (offsetParent) {
        const offsetStyles = window.getComputedStyle(offsetParent);

        // in case the offsetParent is a unpositioned table element (td, th, table)
        // make it relative, for the button to have the correct positioning.
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
        if (offsetStyles.position === 'static') {
            offsetParent.style.position = 'relative';
        }

        // position the element relative to it's offsetParent
        const offsetRight = offsetParent.offsetWidth - textfield.offsetLeft - textfield.offsetWidth;

        offsetParent.appendChild(bubbleInstance);
        bubbleInstance.setAttribute('right', offsetRight);
        bubbleInstance.setAttribute('top', textfield.offsetTop + scrollTop);
        bubbleInstance.setAttribute('visible', 'true');
    }

    // on first-use (after extension is installed),
    // we show the dialog immediately after the bubble is shown.
    if (settings.qaBtn && settings.qaBtn.hasOwnProperty('shownPostInstall')) {
        if (!settings.qaBtn.shownPostInstall) {
            const bubbleButton = bubbleInstance.shadowRoot.querySelector('button');
            bubbleButton.dispatchEvent(new Event('click', { bubbles: true }));
            // don't trigger the button again on next load.
            // mutate the settings object so we don't have to fetch it again.
            settings.qaBtn.shownPostInstall = true;
            store.setSettings({
                key: 'settings',
                val: settings
            });
        }
    }
}

function hideBubble () {
    bubbleInstance.removeAttribute('visible');
}

export function enableBubble () {
    document.body.dataset.briskineButton = 'true';
}

function bubbleEnabled () {
    // gorgiasButton for legacy enterprise support
    const attrs = [ 'gorgiasButton', 'briskineButton' ];
    return attrs.some((a) => {
        return !!document.body.dataset[a];
    });
}
