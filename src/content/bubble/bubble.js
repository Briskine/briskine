/**
 * Bubble.
 * Floating action button.
 */

import { eventShowDialog, eventToggleBubble } from '../../config.js'
import { dialogTagName } from '../dialog/dialog.js'
import { getExtensionData, trigger, on, off } from '../../store/store-content.js'
import { isContentEditable } from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'

import { getActiveElement } from '../utils/active-element.js'
import bubbleAllowlistPrivate from './bubble-allowlist-private.js'
import { addFocusListeners } from '../utils/shadow-focus.js'

import bubbleStyles from './bubble.css'
import bubbleIcon from '../../icons/briskine-logo-small-bare.svg?raw'
import getEventTarget from '../utils/event-target.js'

let bubbleInstance = null
let removeFocusListeners = () => {}

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
        <div>
          <button type="button" class="b-bubble" tabindex="-1">
            ${bubbleIcon}
            <span class="b-bubble-tooltip">
              Search templates (${shortcut})
            </span>
          </button>
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

function handleTextfieldFocus (event) {
  const target = getEventTarget(event)
  if (event.type === 'focusin') {
    showBubble(target)
  } else if (event.type === 'focusout') {
    blurTextfield(event)
  }
}

function blurTextfield (e) {
  // don't hide the bubble if the newly focused node is in the dialog.
  // when pressing the bubble, or when focusing inside the dialog.
  const target = e.relatedTarget
  const host = target?.getRootNode?.()?.host
  if (
    target?.tagName?.toLowerCase?.() === dialogTagName
    || host?.tagName?.toLowerCase?.() === dialogTagName
  ) {
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

  // attach focusin and focusout events with support for shadow dom
  removeFocusListeners = addFocusListeners(handleTextfieldFocus)

  const activeElement = getActiveElement(true)
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

  removeFocusListeners()
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
    // && elem?.parentElement !== document.body
  ) {
    // if (elem.parentElement) {
    //   // sometimes disable for flex and grid parent
    //   const parentStyles = window.getComputedStyle(elem.parentElement)
    //   if (['flex', 'inline-flex', 'grid', 'inline-grid'].includes(parentStyles.display)) {
    //     // flex-direction=row is not supported
    //     if (
    //       ['flex', 'inline-flex'].includes(parentStyles.display)
    //       && parentStyles.flexDirection === 'row'
    //     ) {
    //       return false
    //     }

    //     // check all editable element siblings,
    //     // because we might have a parent flex/grid container,
    //     // but with the editable element filling the entire container.
    //     if (hasVisibleSiblings(elem)) {
    //       return false
    //     }
    //   }
    // }

    // check if the element is big enough
    // to only show the bubble for large textfields
    const metrics = elem.getBoundingClientRect()
    if (metrics.width > textfieldMinWidth && metrics.height > textfieldMinHeight) {
      return true
    }
  }

  return false
}

function getPositioningType (elem) {
  if (elem.parentElement) {
    // sometimes disable for flex and grid parent
    const parentStyles = window.getComputedStyle(elem.parentElement)
    if (['flex', 'inline-flex', 'grid', 'inline-grid'].includes(parentStyles.display)) {
      return 'anchor'
    }
  } else {
    return 'anchor'
  }

  return 'sticky'
}

let resizeObserver = null
let cachedTextfield = null
const anchorNameStart = '--b-bubble-anchor'

async function showBubble (textfield) {
  // only show it for valid elements
  if (!isValidTextfield(textfield)) {
    return false
  }

  cachedTextfield = textfield

  // detect rtl
  const textfieldStyles = window.getComputedStyle(textfield)
  const direction = textfieldStyles.direction || 'ltr'
  bubbleInstance.setAttribute('dir', direction)

  // TODO move to offset parent
  if (textfield.previousSibling !== bubbleInstance) {
    textfield.before(bubbleInstance)
  }

  bubbleInstance.setAttribute('visible', 'true')

  // set max-width to the width of textfield,
  // in case the container of the textfield is larger than the textfield.
  bubbleInstance.style.setProperty(maxHostWidthCssVar, `${textfield.offsetWidth}px`)

  // move bubble further down, in case the textfield uses a top margin
  bubbleInstance.style.setProperty(bubbleTopCssVar, textfieldStyles.marginTop)

  bubbleInstance.style.setProperty('--left', `${textfield.offsetLeft}px`)

  // const position = getPositioningType(textfield)
  // if (position === 'anchor') {
    const styles = window.getComputedStyle(textfield)
    let positionAnchor = styles.positionAnchor
    if (
      !positionAnchor
      || positionAnchor === 'none'
    ) {
      positionAnchor = `${anchorNameStart}-${Date.now()}`
      textfield.style.anchorName = positionAnchor
    }

    bubbleInstance.style.setProperty('--x-x', positionAnchor)

    bubbleInstance.style.positionAnchor = positionAnchor

    //
    // bubbleInstance.setAttribute('anchor', 'true')
  // }

  resizeObserver = new ResizeObserver((entries, observer) => {
    if (!bubbleInstance) {
      observer.disconnect()
      return
    }

    for (const entry of entries) {
      if (entry.borderBoxSize) {
        // bubbleInstance.style.setProperty(maxHostWidthCssVar, `${textfield.offsetWidth}px`)
        // bubbleInstance.style.setProperty('--left', `${textfield.offsetLeft}px`)
      }
    }
  })

  resizeObserver.observe(textfield)
}

function hideBubble () {
  if (bubbleInstance.hasAttribute('anchor')) {
    // TODO fadeout transition looks bad when hiding the bubble
    bubbleInstance.removeAttribute('anchor')
    bubbleInstance.style.positionAnchor = null
    if (cachedTextfield) {
      const styles = window.getComputedStyle(cachedTextfield)
      if (
        styles.anchorName
        && styles.anchorName.startsWith(anchorNameStart)
      ) {
        cachedTextfield.style.anchorName = null
      }
    }
  }

  // bubbleInstance.removeAttribute('visible')

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}
