/**
 * Bubble.
 * Floating action button.
 */

import config from '../../config.js'
import {dialogTagName} from '../dialog/dialog.js'
import { getExtensionData } from '../../store/store-content.js'

import getEventTarget from '../event-target.js'
import getActiveElement from '../active-element.js'
import bubbleAllowlistPrivate from './bubble-allowlist-private.js'

import bubbleStyles from './bubble.css'
import bubbleIcon from '../../icons/briskine-logo-small-bare.svg?raw'

let bubbleInstance = null
let activeTextfield = null

const maxHostWidthCssVar = '--max-host-width'
const bubbleTopCssVar = '--bubble-top'

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
          </span>
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
        this.$button.dispatchEvent(new CustomEvent(config.eventShowDialog, {
          bubbles: true,
          composed: true,
        }))
      })

      this.ready = true
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

let toggleBubbleHandler = () => {}

function makeToggleBubbleHandler (settings) {
  return ({detail}) =>{
    if (detail) {
      create(settings)
    } else {
      destroyInstance()
    }
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

  if (bubbleAllowlistPrivate(hostname, {content: true}) || bubbleAllowlist.includes(hostname)) {
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

function removeShadowFocusEvents (shadow) {
  shadow.removeEventListener('focusin', focusTextfield, true)
  shadow.removeEventListener('focusout', blurTextfield, true)
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
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          addShadowFocusEvents(node)
        }
      }

      for (const node of Array.from(record.removedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const nodeShadowRoots = findAllShadowRoots(node)
          shadowRoots = shadowRoots.filter((shadow) => {
            if (nodeShadowRoots.includes(shadow)) {
              removeShadowFocusEvents(shadow)
              return false
            }
            return true
          })
        }
      }
    }
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
      if (shadow) {
        removeShadowFocusEvents(shadow)
      }
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

  enableShadowFocus()

  const activeElement = getActiveElement()
  if (activeElement) {
    showBubble(activeElement)
  }
}

function destroyInstance () {
  if (bubbleInstance) {
    hideBubble()
    resizeObserver = null

    bubbleInstance.remove()
    bubbleInstance = null
  }

  document.removeEventListener('focusin', focusTextfield, true)
  document.removeEventListener('focusout', blurTextfield, true)

  disableShadowFocus()
}

export function destroy () {
  destroyInstance()
  window.removeEventListener(config.eventToggleBubble, toggleBubbleHandler)
}

const textfieldMinWidth = 100
const textfieldMinHeight = 25

function isValidTextfield (elem) {
  if (
    // is html element
    elem?.nodeType === Node.ELEMENT_NODE
    // is editable
    && elem.matches('textarea, [contenteditable]')
    // has a parent element node
    && elem.parentElement
    // the parent is not the body
    && elem.parentElement !== document.body
  ) {

    // disable for flex and grid
    const parentStyles = window.getComputedStyle(elem.parentElement)

    if (
      // parent is flex or grid
      ['flex', 'grid'].includes(parentStyles.display)
      // check all editable element siblings,
      // because we might have a parent flex/grid container,
      // but with the editable element filling the entire container.
      && Array.from(elem.parentElement.childNodes).some((node) => {
        // direct non-empty text nodes will trigger flex/grid layout
        if (
          node.nodeType === Node.TEXT_NODE
          && node.nodeValue.trim() !== ''
        ) {
          return true
        }

        if (
          // allow comments and other invisible node types
          node.nodeType !== Node.ELEMENT_NODE
          // exclude the editable node
          || node === elem
          // exclude the bubble, in case we already moved it to the parent
          || node === bubbleInstance
          // exclude hidden nodes
          || node.checkVisibility() === false
        ) {
          return false
        }

        // exclude absolute/sticky/fixed positioned nodes
        const nodeStyles = window.getComputedStyle(node)
        if (!['static', 'relative'].includes(nodeStyles.position)) {
          return false
        }

        return true
      })
    ) {
      return false
    }

    // check if the element is big enough
    // to only show the bubble for large textfields
    const metrics = elem.getBoundingClientRect()
    if (metrics.width > textfieldMinWidth && metrics.height > textfieldMinHeight) {
      return true
    }
  }

  return false
}

let resizeObserver = null

async function showBubble (textfield) {
  // only show it for valid elements
  if (!isValidTextfield(textfield)) {
    return false
  }

  // detect rtl
  const textfieldStyles = window.getComputedStyle(textfield)
  const direction = textfieldStyles.direction || 'ltr'
  bubbleInstance.setAttribute('dir', direction)

  if (textfield.previousSibling !== bubbleInstance) {
    textfield.before(bubbleInstance)
  }

  bubbleInstance.setAttribute('visible', 'true')

  // set max-width to the width of textfield,
  // in case the container of the textfield is larger than the textfield.
  bubbleInstance.style.setProperty(maxHostWidthCssVar, textfieldStyles.width)

  // move bubble further down, in case the textfield uses a top margin
  bubbleInstance.style.setProperty(bubbleTopCssVar, textfieldStyles.marginTop)

  const maxWidthProperty = textfieldStyles.boxSizing === 'border-box' ? 'borderBoxSize' : 'contentBoxSize'

  resizeObserver = new ResizeObserver((entries, observer) => {
    if (!bubbleInstance) {
      observer.disconnect()
      return
    }

    for (const entry of entries) {
      if (
        entry.borderBoxSize
        && entry[maxWidthProperty][0]
      ) {
        bubbleInstance.style.setProperty(maxHostWidthCssVar, `${entry[maxWidthProperty][0].inlineSize}px`)
      }
    }
  })

  resizeObserver.observe(textfield)
}

function hideBubble () {
  bubbleInstance.removeAttribute('visible')

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}
