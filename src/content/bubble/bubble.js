/**
 * Bubble.
 * Floating action button.
 */

import { eventShowDialog, eventToggleBubble } from '../../config.js'
import {dialogTagName} from '../dialog/dialog.js'
import { getExtensionData, trigger, on, off } from '../../store/store-content.js'
import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'

import getEventTarget from '../utils/event-target.js'
import getActiveElement from '../utils/active-element.js'
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

        // trigger the event on the bubble,
        // to position the dialog next to it.
        trigger(eventShowDialog, {
          target: this.$button,
        })
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
  return ({ enabled } = {}) => {
    if (enabled) {
      return create(settings)
    }

    return destroyInstance()
  }
}

export async function setup (settings = {}) {
  // check if bubble or dialog are disabled in settings
  if (settings.dialog_button === false || settings.dialog_enabled === false) {
    return
  }

  toggleBubbleHandler = makeToggleBubbleHandler(settings)

  on(eventToggleBubble, toggleBubbleHandler)

  const { hostname } = window.location
  const extensionData = await getExtensionData()
  const { bubbleAllowlist = [] } = extensionData

  if (bubbleAllowlistPrivate(hostname, {content: true}) || bubbleAllowlist.includes(hostname)) {
    create(settings)
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
  off(eventToggleBubble, toggleBubbleHandler)
}

const textfieldMinWidth = 100
const textfieldMinHeight = 32

// visible siblings that take up space
function hasVisibleSiblings (elem) {
  return Array.from(elem.parentElement.childNodes).some((node) => {
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
}

function isValidTextfield (elem) {
  if (
    // is html element
    elem?.nodeType === Node.ELEMENT_NODE
    // is editable
    && (
      (
        isTextfieldEditor(elem)
        && elem.tagName.toLowerCase() === 'textarea'
      )
      || isContentEditable(elem)
    )
    // the parent is not the body
    && elem?.parentElement !== document.body
  ) {
    if (elem.parentElement) {
      // sometimes disable for flex and grid parent
      const parentStyles = window.getComputedStyle(elem.parentElement)
      if (['flex', 'grid'].includes(parentStyles.display)) {
        // flex-direction=row is not supported
        if (
          parentStyles.display === 'flex'
          && parentStyles.flexDirection === 'row'
        ) {
          return false
        }

        // check all editable element siblings,
        // because we might have a parent flex/grid container,
        // but with the editable element filling the entire container.
        if (hasVisibleSiblings(elem)) {
          return false
        }
      }
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

// shadow root support for focusin/out.
// focusin and focusout events are *composed*, so they bubble out of the shadow dom.
// but *only if the shadow root host loses or gains focus*.
// if all of the focusing and blurring happens inside the same shadow root,
// only the shadow root will be able to catch those events.
// only when we focus outside of the shadow root (or when we focus inside the shadow root, from outside),
// will our regular document handler catch the event.
// that's why we need to also need to attach the focusin/out listeners to the shadow roots.
let shadowRootsRegistry = new Set()

function hookShadowRoot (shadow) {
  if (shadow instanceof ShadowRoot && !shadowRootsRegistry.has(shadow)) {
    shadowRootsRegistry.add(shadow)
    shadow.addEventListener('focusin', focusTextfield, true)
    shadow.addEventListener('focusout', blurTextfield, true)

    return true
  }

  return false
}

function globalFocusHandler (event) {
  const path = event.composedPath()

  for (const node of path) {
    if (node instanceof ShadowRoot) {
      const isNew = hookShadowRoot(node)

      // if this is the first time we hook this shadow root,
      // the focusin event could already be in progress.
      // manually trigger it because the newly attached listener might miss it.
      if (isNew) {
        focusTextfield(event)
      }
    }
  }
}

function enableShadowFocus () {
  document.addEventListener('focusin', globalFocusHandler, true)
}

function disableShadowFocus () {
  document.removeEventListener('focusin', globalFocusHandler, true)

  shadowRootsRegistry.forEach((shadow) => {
    shadow.removeEventListener('focusin', focusTextfield, true)
    shadow.removeEventListener('focusout', blurTextfield, true)
  })

  shadowRootsRegistry.clear()
}
