/**
 * Bubble.
 * Floating action button.
 */

import config from '../../config.js'
import {dialogTagName} from '../dialog/dialog.js'
import { getExtensionData } from '../../store/store-content.js'

import getEventTarget from '../event-target.js'
import getActiveElement from '../active-element.js'

import bubbleStyles from './bubble.css'
import bubbleIcon from '../../icons/briskine-logo-small-bare.svg?raw'

let bubbleInstance = null
let activeTextfield = null

const maxHostWidthCssVar = '--max-host-width'

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
        <button type="button" class="b-bubble" tabindex="-1">
          ${bubbleIcon}
          <span class="b-bubble-tooltip">
            Search templates (${shortcut})
          </div>
        </button>
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
        // bubbleInstance.setAttribute('top', getTopPosition(activeTextfield, e.target))
      }

      scrollTick = false
    })

    scrollTick = true
  }
}

function isOnPredefinedLocation (hostname) {
  const urls = [
    'mail.google.com',
    'www.linkedin.com',
    'outlook.live.com',
    'outlook.office365.com',
  ]

  return (
      urls.some((url) => hostname === url) ||
      document.querySelector(`
        head [href*="cdn.office.net"],
        meta[content*="owamail"],
        link[href*="/owamail/"],
        script[src*="/owamail/"]
      `)
  )
}

let toggleBubbleHandler = () => {}

function makeToggleBubbleHandler (settings) {
  return ({detail}) =>{
    if (detail)
      create(settings)
    else
      destroy()
  }
}

export async function setup (settings = {}) {
  // check if bubble or dialog are disabled in settings
  if (settings.dialog_button === false || settings.dialog_enabled === false) {
    return
  }

  toggleBubbleHandler = makeToggleBubbleHandler(settings)

  window.addEventListener(config.eventToggleBubble, toggleBubbleHandler)

  const { hostname } = window.location
  const extensionData = await getExtensionData()
  const { bubbleAllowlist = [] } = extensionData

  if (isOnPredefinedLocation(hostname) || bubbleAllowlist.includes(hostname)) {
    create(settings)
  }
}

let shadowRoots = []
let shadowObserver = null

function findAllShadowRoots (node, roots = []) {
  // if the current node has a shadow root, add it to our list.
  if (node.shadowRoot) {
    roots.push(node.shadowRoot)
    // search for more shadow roots *inside* this one.
    findAllShadowRoots(node.shadowRoot, roots)
  }

  // traverse through all child elements of the current node.
  for (const child of node.children) {
    findAllShadowRoots(child, roots)
  }

  return roots
}

function addShadowFocusEvents (parent) {
  const newShadowRoots = findAllShadowRoots(parent)
  newShadowRoots.forEach((shadow) => {
    if (!shadowRoots.includes(shadow)) {
      shadowRoots.push(shadow)
      shadow.addEventListener('focusin', focusTextfield, true)
      shadow.addEventListener('focusout', blurTextfield, true)
    }
  })
}

// focusin and focusout events are *composed*, so they bubble out of the shadow dom.
// but *only if the shadow root host loses or gains focus*.
// if all of the focusing and blurring happens inside the same shadow root,
// only the shadow root will be able to catch those events.
// only when we focus outside of the shadow root (or when we focus inside the shadow root, from outside),
// will our regular document handler catch the event.
// that's why we need to get all shadow roots from the dom, and attach the focusin and focusout
// events on each one.
// when we first focus inside the shadow root, or focus outside the shadow root, from inside,
// the events will trigger twice.
function enableShadowFocus () {
  addShadowFocusEvents(document.body)

  shadowObserver = new MutationObserver((records) => {
    records
      .flatMap((record) => Array.from(record.addedNodes))
      .forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          addShadowFocusEvents(node)
        }
      })
  })

  shadowObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function disableShadowFocus () {
  if (shadowObserver) {
    shadowObserver.disconnect()
    shadowObserver = null

    shadowRoots.forEach((shadow) => {
      if (!shadow) {
        return
      }

     shadow.removeEventListener('focusin', focusTextfield, true)
     shadow.removeEventListener('focusout', blurTextfield, true)
    })
    shadowRoots = []
  }
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

  enableShadowFocus()

  const activeElement = getActiveElement()
  if (activeElement) {
    showBubble(activeElement)
  }
}

export function destroyInstance () {
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

  disableShadowFocus()
}

export function destroy () {
  destroyInstance()
  window.removeEventListener(config.eventToggleBubble, toggleBubbleHandler, true)
}

const textfieldMinWidth = 100
const textfieldMinHeight = 25

function isValidTextfield (elem) {
  // if the element is a textfield
  if (elem instanceof Element && elem.matches('textarea, [contenteditable]')) {
    // check if the element is big enough
    // to only show the bubble for large textfields
    const metrics = elem.getBoundingClientRect()
    if (metrics.width > textfieldMinWidth && metrics.height > textfieldMinHeight) {
      return true
    }
  }

  return false
}

async function showBubble (textfield) {
  // only show it for valid elements
  if (!isValidTextfield(textfield)) {
    return false
  }

  // detect rtl
  // TODO fix rtl support in css
  const textfieldStyles = window.getComputedStyle(textfield)
  const direction = textfieldStyles.direction || 'ltr'
  bubbleInstance.setAttribute('dir', direction)

  if (textfield.previousSibling !== bubbleInstance) {
    textfield.before(bubbleInstance)
  }

  // set max-width to max width of textfield,
  // in case the container of the textfield is larger than the text field.
  bubbleInstance.style.setProperty(maxHostWidthCssVar, textfieldStyles.width)

  bubbleInstance.setAttribute('visible', 'true')
}

function hideBubble () {
  bubbleInstance.removeAttribute('visible')

  // TODO use a timer and move bubble back to the documentElement?
}
