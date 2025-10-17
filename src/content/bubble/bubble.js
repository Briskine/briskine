/**
 * Bubble.
 * Floating action button.
 */

import config from '../../config.js'
import {dialogTagName} from '../dialog/dialog.js'

import getEventTarget from '../event-target.js'

import bubbleStyles from './bubble.css'
import bubbleIcon from '../../icons/briskine-logo-small-bare.svg?raw'

let bubbleInstance = null
let activeTextfield = null
const domObservers = []

const bubbleAttribute = 'data-briskine-bubble'
export const bubbleTagName = `b-bubble-${Date.now().toString(36)}`

customElements.define(
  bubbleTagName,
  class extends HTMLElement {
    constructor() {
      super()

      this.ready = false
    }
    connectedCallback () {
      // element was already created,
      // just moved around in the dom.
      if (this.ready || !this.isConnected) {
        return
      }

      // dialog shortcut
      const shortcut = this.getAttribute('shortcut') || 'ctrl+space'

      const template = `
        <style>${bubbleStyles}</style>
        <button type="button" class="b-bubble" tabindex="-1">${bubbleIcon}</button>
        <span class="b-bubble-tooltip">
        Search templates (${shortcut})
        </div>
      `
      const shadowRoot = this.attachShadow({mode: 'open'})
      shadowRoot.innerHTML = template

      this.$button = this.shadowRoot.querySelector('.b-bubble')
      this.$button.addEventListener('mousedown', (e) => {
        // prevent stealing focus when clicking the button
        e.preventDefault()
      })
      this.$button.addEventListener('click', (e) => {
        e.stopPropagation()

        // trigger the event on the bubble, to position the dialog next to it.
        e.target.dispatchEvent(new CustomEvent(config.eventShowDialog, {
          bubbles: true,
          composed: true,
        }))
      })


      this.ready = true
    }
    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'top' || name === 'right') {
        this.style[name] = `${newValue}px`
      }
    }
    static get observedAttributes() {
      return [
        'top',
        'right',
      ]
    }
  }
)

function focusTextfield (e) {
  // used for showing the dialog completion
  activeTextfield = getEventTarget(e)

  return showBubble(activeTextfield)
}

function blurTextfield (e) {
  // TODO BUG relatedTarget won't work in shadow dom.
  // don't hide the bubble if the newly focused node is in the dialog.
  // eg. when clicking the bubble.
  if (e.relatedTarget && e.relatedTarget.closest(dialogTagName)) {
    return
  }

  return hideBubble()
}

// reposition the bubble on scroll
let scrollTick = false
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
        bubbleInstance.setAttribute('top', getTopPosition(activeTextfield, e.target))
      }

      scrollTick = false
    })

    scrollTick = true
  }
}

export function setup (settings = {}) {
  // check if bubble or dialog are disabled in settings
  if (settings.dialog_button === false || settings.dialog_enabled === false) {
    return
  }

  // if bubble is enabled in dom
  if (bubbleEnabled()) {
    return create(settings)
  }

  const domObserver = new MutationObserver((records, observer) => {
    if (bubbleEnabled()) {
      observer.disconnect()
      create(settings)
    }
  })
  domObserver.observe(document.body, {
    attributes: true
  })

  domObservers.push(domObserver)
}

function create (settings = {}) {
  // bubble is created outside the body.
  // when textfields are focused, move it to the offsetParent for positioning.
  bubbleInstance = document.createElement(bubbleTagName)
  // custom dialog shortcut
  bubbleInstance.setAttribute('shortcut', settings.dialog_shortcut)
  document.documentElement.appendChild(bubbleInstance)

  // show the bubble on focus
  document.addEventListener('focusin', focusTextfield, true)
  document.addEventListener('focusout', blurTextfield, true)

  // reposition bubble on scroll
  document.addEventListener('scroll', scrollDocument, true)
}

export function destroy () {
  if (bubbleInstance) {
    bubbleInstance.remove()
    bubbleInstance = null
  }

  document.removeEventListener('focusin', focusTextfield, true)
  document.removeEventListener('focusout', blurTextfield, true)
  document.removeEventListener('scroll', scrollDocument, true)

  // disconnect all observers
  domObservers.forEach((observer) => {
    observer.disconnect()
  })
}

// top-right sticky positioning,
// considering scroll.
function getTopPosition (textfield, parent) {
  const textfieldRect = textfield.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  const distanceFromParent = textfieldRect.top - parentRect.top

  let top = textfield.offsetTop

  // top position of textfield is scrolled out of view
  if (distanceFromParent < 0) {
    top = top + Math.abs(distanceFromParent)
  }

  return top
}

const textfieldMinWidth = 100
const textfieldMinHeight = 25

function isValidTextfield (elem) {
  // if the element is a textfield
  if (elem.matches('textarea, [contenteditable]')) {
    // check if the element is big enough
    // to only show the bubble for large textfields
    const metrics = elem.getBoundingClientRect()
    if (metrics.width > textfieldMinWidth && metrics.height > textfieldMinHeight) {
      return true
    }
  }

  return false
}

// finds the first offsetParent that could be scrollable
function findScrollParent (target) {
  const parent = target.offsetParent
  if (!parent) {
    return null
  }
  const parentStyles = window.getComputedStyle(parent)

  const scrollValues = [
    'scroll',
    'auto',
    // used by outlook.com, draws scrollbars on top of the content.
    // deprecated form the spec and only supported in webkit-like browsers.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/overflow
    'overlay',
  ]
  if (
    scrollValues.includes(parentStyles.overflow) ||
    scrollValues.includes(parentStyles.overflowY)
  ) {
    return parent
  }

  return findScrollParent(parent)
}

function showBubble (textfield) {
  // only show it for valid elements
  if (!isValidTextfield(textfield)) {
    return false
  }

  // detect rtl
  const textfieldStyles = window.getComputedStyle(textfield)
  const direction = textfieldStyles.direction || 'ltr'
  bubbleInstance.setAttribute('dir', direction)

  const offsetParent = textfield.offsetParent

  if (offsetParent) {
    const offsetStyles = window.getComputedStyle(offsetParent)

    // in case the offsetParent is a unpositioned table element (td, th, table)
    // make it relative, for the button to have the correct positioning.
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
    if (offsetStyles.position === 'static') {
      offsetParent.style.position = 'relative'
    }

    // position the element relative to it's offsetParent
    const offsetRight = offsetParent.offsetWidth - textfield.offsetLeft - textfield.offsetWidth

    let top = textfield.offsetTop
    const scrollParent = findScrollParent(textfield)
    if (scrollParent) {
      top = getTopPosition(textfield, scrollParent)
    }

    // only move the bubble around in the dom,
    // if it's not already where it needs to be.
    if (!Array.from(offsetParent.childNodes).find((node) => node === bubbleInstance)) {
      offsetParent.appendChild(bubbleInstance)
    }
    bubbleInstance.setAttribute('right', offsetRight)
    bubbleInstance.setAttribute('top', top)
    bubbleInstance.setAttribute('visible', 'true')
  }
}

function hideBubble () {
  bubbleInstance.removeAttribute('visible')
}

export function enableBubble () {
  document.body.setAttribute(bubbleAttribute, 'true')
}

function bubbleEnabled () {
  return (
    document.body &&
    document.body.hasAttribute(bubbleAttribute)
  )
}
