/**
 * Bubble.
 * Floating action button.
 */

customElements.define(
    'g-bubble',
    class extends HTMLElement {
        constructor() {
            super();

            const template = `
                <style>
                    .g-button {
                        background: red;
                    }
                </style>
                <button type="button" class="g-button">
                    gbutton
                </button>
            `
            const shadowRoot = this.attachShadow({mode: 'open'});
            shadowRoot.innerHTML = template;
        }
        connectedCallback() {

        }
    }
);

export function setup () {
    if (bubbleEnabled()) {
        return create();
    }

    const domObserver = new MutationObserver((records, observer) => {
        if (bubbleEnabled()) {
            observer.disconnect();

            create();
        }
    });
    domObserver.observe(document.body, {
        attributes: true
    });
};

function create () {
    // TODO create the button outside the body,
    // when the textfield is focused, move it close to it.
    // use shadow dom for the content and the styles.

    const bubble = document.createElement('g-bubble');
    document.documentElement.appendChild(bubble);

    console.log('append bubble', bubble);

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
};

export function enableBubble () {
    document.body.dataset.gorgiasButton = 'true';
};

function bubbleEnabled () {
    return !!document.body.dataset.gorgiasButton;
};
