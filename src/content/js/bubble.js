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

            const template = `
                <style>
                    .b-bubble {
                        background: red;
                        position: absolute;
                        top: 0;
                        right: 0;
                        margin: 5px;
                        opacity: 0;
                        visibility: hidden;
                        transform: translateY(0.4rem);
                        transition: all ease-out .1s;
                    }

                    .b-bubble-visible {
                        opacity: 1;
                        visibility: visible;
                        transform: translateY(0);
                    }
                </style>
                <button type="button" class="b-bubble">
                    gbutton
                </button>
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

            this.bubbleVisibilityTimer = null;
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
                this.$button.style[name] = `${newValue}px`;
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
    document.documentElement.appendChild(bubbleInstance);

    console.log('append bubble', bubbleInstance);

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





//     var container = $('body');
//
//     var instance = this;
//
//     // add the dialog quick access icon
//     instance.qaBtn = $(instance.qaBtnTemplate);
//     instance.qaTooltip = $(instance.qaBtnTooltip);
//
//     container.append(instance.qaBtn);
//     container.append(instance.qaTooltip);
//
//     var showQaBtnTimer;
//
//     // move the quick access button around
//     // to the focused text field
//     // the focus event doesn't support bubbling
//     container.on('focusin', function (e) {
//
//         if (showQaBtnTimer) {
//             clearTimeout(showQaBtnTimer);
//         }
//
//         // add a small delay for showing the qa button.
//         // in case the element's styles change its position on focus.
//         // eg. gmail when you have multiple addresses configured,
//         // and the from fields shows/hides on focus.
//         showQaBtnTimer = setTimeout(function () {
//             instance.showQaBtn(e);
//         }, 350);
//
//     });
//
//     container.on('focusout', function (e) {
//         if (showQaBtnTimer) {
//             clearTimeout(showQaBtnTimer);
//         }
//         instance.hideQaBtn(e);
//     });
//
//     instance.qaBtn.on('mouseup', function (e) {
//
//         // return the focus to the element focused
//         // before clicking the qa button
//         dialog.prevFocus.focus();
//
//         // position the dialog under the qa button.
//         // since the focus node is now the button
//         // we have to pass the previous focus (the text node).
//         dialog.completion(e, {
//             focusNode: dialog.prevFocus,
//             dialogPositionNode: e.target,
//             source: 'button'
//         });
//
//         $('body').addClass('qa-btn-dropdown-show');
//     });
//
//     var showQaTooltip;
//     // Show tooltip
//     instance.qaBtn.on('mouseenter', function () {
//         if (showQaTooltip) {
//             clearTimeout(showQaTooltip);
//         }
//         showQaTooltip = setTimeout(function () {
//             var padding = 22;
//             var rect = instance.qaBtn[0].getBoundingClientRect();
//             instance.qaTooltip.css({
//                 top: rect.top - padding - parseInt(instance.qaTooltip.css('height'), 10) + "px",
//                 left: rect.left + 45 - parseInt(instance.qaTooltip.css('width'), 10) + "px"
//             });
//             instance.qaTooltip.show();
//         }, 500);
//
//     });
//
//     // Hide tooltip
//     instance.qaBtn.on('mouseleave', function () {
//         clearTimeout(showQaTooltip);
//         instance.qaTooltip.hide();
//     });
}

function showQaForElement (elem) {
    var show = false;

    // if the element is not a textarea
    // input[type=text] or contenteditable
    if (elem.matches('textarea, input[type=text], [contenteditable]')) {
        show = true;
    }

    // if the quick access button is focused/clicked
    if (elem.className.indexOf('gorgias-qa-btn') !== -1) {
        show = false;
    }

    // if the dialog search field is focused
    if (elem.className.indexOf('qt-dropdown-search') !== -1) {
        show = false;
    }

    // check if the element is big enough
    // to only show the qa button for large textfields
    if (show === true) {
        var metrics = elem.getBoundingClientRect();
        if (metrics.width < 100 || metrics.height < 30) {
            show = false;
        }
    }

    return show;
}

function showBubble (textfield, settings) {
   // only show it for valid elements
    if (!showQaForElement(textfield)) {
        return false;
    }

    const offsetParent = textfield.offsetParent;
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
        bubbleInstance.setAttribute('top', textfield.offsetTop);
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


    // TODO use settings on create, not on show
//     store.getSettings({
//         key: 'settings'
//     }).then((settings) => {
//         if (settings.qaBtn && settings.qaBtn.enabled === false) {
//             return;
//         }
//
//         $('body').addClass('gorgias-show-qa-btn');
//
//         dialog.prevFocus = textfield;
//
//         var qaBtn = dialog.qaBtn.get(0);
//
//         // padding from the top-right corner of the textfield
//         var padding = 10;
//
//         // positioning the quick-action button.
//         // Gmail is custom made
//         // TODO use the general positioning method for Gmail
//         if (window.location.origin === "https://mail.google.com") {
//             var gmailHook = $(textfield).closest('td');
//             if (gmailHook.length) {
//                 $(qaBtn).css({
//                     'top': padding + "px",
//                     'right': padding + "px",
//                     'left': 'initial'
//                 });
//                 qaBtn.remove();
//                 gmailHook.append(qaBtn);
//
//                 return;
//             }
//         } else {
//             activeTextfield = textfield;
//             setQaBtnPosition();
//             window.addEventListener('scroll', setQaBtnPosition, true);
//         }
//
//     });
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
