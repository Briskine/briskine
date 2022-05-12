/**
 * Bubble.
 * Floating action button.
 */

// import dialog from '../dialog.js'
import {dialogShowEvent, dialogTagName} from '../dialog/dialog.js'
import store from '../../store/store-client.js'

import bubbleStyles from './bubble.css?raw'

let bubbleInstance = null
let activeTextfield = null
const domObservers = []

export const bubbleTagName = 'b-bubble'

function defineBubble () {
  customElements.define(
    bubbleTagName,
    class extends HTMLElement {
        constructor() {
            super();

            this.ready = false;
            this.bubbleVisibilityTimer = null;
        }
        connectedCallback () {
            // element was already created,
            // just moved around in the dom.
            if (this.ready || !this.isConnected) {
                return;
            }

            // dialog shortcut
            const shortcut = this.getAttribute('shortcut') || 'ctrl+space';

            const template = `
                <style>${bubbleStyles}</style>
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
                e.stopPropagation()

                // position the dialog under the qa button.
                // since the focus node is now the button
                // we have to pass the previous focus (the text node).
                e.target.dispatchEvent(new CustomEvent(dialogShowEvent, {
                  bubbles: true,
                  composed: true,
                  detail: {
                    focusNode: activeTextfield,
                  }
                }))

//                 dialog.completion(e, {
//                     focusNode: activeTextfield,
//                     dialogPositionNode: e.target,
//                     source: 'button'
//                 });
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
}

function focusTextfield (e) {
  // used for showing the dialog completion
  activeTextfield = e.target;

  return showBubble(e.target);
}

function blurTextfield (e) {
  // don't hide the bubble if the newly focused node is in the dialog.
  // eg. when clicking the bubble.
  if (e.relatedTarget && e.relatedTarget.closest(dialogTagName)) {
      return;
  }

  return hideBubble();
}

// reposition the bubble on scroll
let scrollTick = false;
function scrollDocument (e) {
  if (!scrollTick) {
      window.requestAnimationFrame(() => {
          if (
              e.target &&
              // must be an element node (eg. not the document)
              e.target.nodeType === Node.ELEMENT_NODE &&
              e.target.contains(activeTextfield) &&
              bubbleInstance &&
              bubbleInstance.getAttribute('visible') === 'true'
          ) {
              bubbleInstance.setAttribute('top', getTopPosition(activeTextfield, e.target));
          }

          scrollTick = false;
      });

      scrollTick = true;
  }
}

export function setup (settings = {}) {
  // if bubble is enabled in settings
  if (settings.dialog_button === false) {
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

  domObservers.push(domObserver)
}

function create (settings = {}) {
  // bubble is defined later,
  // to avoid errors with other existing intances on page,
  // when reloading the bubble without page refresh.
  // (connectedCallback is triggered when re-defining an existing element)
  defineBubble();

  // bubble is created outside the body.
  // when textfields are focused, move it to the offsetParent for positioning.
  bubbleInstance = document.createElement('b-bubble');
  // custom dialog shortcut
  bubbleInstance.setAttribute('shortcut', settings.dialog_shortcut);
  document.documentElement.appendChild(bubbleInstance);

  // show the bubble on focus
  document.addEventListener('focusin', focusTextfield);
  document.addEventListener('focusout', blurTextfield);

  // reposition bubble on scroll
  document.addEventListener('scroll', scrollDocument, true);

  // wait for the bubbble to be shown
  const bubbleObserver = new MutationObserver((records, observer) => {
    if (bubbleInstance.getAttribute('visible') === 'true') {
      // on first-use (after extension is installed),
      // we show the dialog immediately after the bubble is shown.
      store.getExtensionData()
        .then((data) => {
          if (data.showPostInstall) {
            showPostInstall()

            // don't show the button again on next load
            store.setExtensionData({
              showPostInstall: false
            })
          }
        })

      observer.disconnect()
    }
  })
  bubbleObserver.observe(bubbleInstance, {
      attributes: true
  });

  domObservers.push(bubbleObserver)
}

export function destroy () {
  if (bubbleInstance) {
    bubbleInstance.remove()
  }

  document.removeEventListener('focusin', focusTextfield);
  document.removeEventListener('focusout', blurTextfield);
  document.removeEventListener('scroll', scrollDocument, true);

  // disconnect all observers
  domObservers.forEach((observer) => {
    observer.disconnect()
  })
}

function showPostInstall () {
  const bubbleButton = bubbleInstance.shadowRoot.querySelector('button');
  if (bubbleButton) {
    bubbleButton.dispatchEvent(new Event('click', { bubbles: true }));
  }
}

// top-right sticky positioning,
// considering scroll.
function getTopPosition (textfield, parent) {
    // TODO expensive operation,
    // see if we can improve performance.
    const textfieldRect = textfield.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const distanceFromParent = textfieldRect.top - parentRect.top;

    let top = textfield.offsetTop;

    // top position of textfield is scrolled out of view
    if (distanceFromParent < 0) {
        top = top + Math.abs(distanceFromParent);
    }

    return top;
}

function isValidTextfield (elem) {
    // if the element is a textfield
    if (elem.matches('textarea, [contenteditable]')) {
        // check if the element is big enough
        // to only show the bubble for large textfields
        const metrics = elem.getBoundingClientRect();
        if (metrics.width > 100 && metrics.height > 34) {
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

    const scrollValues = [
        'scroll',
        'auto',
        // used by outlook.com, draws scrollbars on top of the content.
        // deprecated form the spec and only supported in webkit-like browsers.
        // https://developer.mozilla.org/en-US/docs/Web/CSS/overflow
        'overlay'
    ];
    if (
        scrollValues.includes(parentStyles.overflow) ||
        scrollValues.includes(parentStyles.overflowY)
    ) {
        return parent;
    }

    return findScrollParent(parent);
}

function showBubble (textfield) {
   // only show it for valid elements
    if (!isValidTextfield(textfield)) {
        return false;
    }

    // detect rtl
    const textfieldStyles = window.getComputedStyle(textfield);
    const direction = textfieldStyles.direction || 'ltr';
    bubbleInstance.setAttribute('dir', direction);

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

        let top = textfield.offsetTop;
        const scrollParent = findScrollParent(textfield);
        if (scrollParent) {
            top = getTopPosition(textfield, scrollParent);
        }

        offsetParent.appendChild(bubbleInstance);
        bubbleInstance.setAttribute('right', offsetRight);
        bubbleInstance.setAttribute('top', top);
        bubbleInstance.setAttribute('visible', 'true');
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
