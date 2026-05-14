/**
 * Bubble.
 * Floating action button.
 */

import { computePosition, autoUpdate, offset, shift, limitShift, hide } from '@floating-ui/dom'

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
let cleanupFloatingUi = () => {}

export const bubbleTagName = `b-bubble-${Date.now().toString(36)}`

customElements.define(
  bubbleTagName,
  class extends HTMLElement {
    connectedCallback () {
      if (!this.isConnected || this.shadowRoot) {
        return
      }

      // dialog shortcut
      const shortcut = this.getAttribute('shortcut') || 'ctrl+space'

      const template = `
        <style>${bubbleStyles}</style>
        <button type="button" tabindex="-1">
          ${bubbleIcon}
          <span>
            Search templates (${shortcut})
          </span>
        </button>
      `
      const shadowRoot = this.attachShadow({mode: 'open'})
      shadowRoot.innerHTML = template

      shadowRoot.addEventListener('mousedown', (e) => {
        e.preventDefault()
      })

      shadowRoot.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('button')
        if (!btn) {
          return
        }

        e.stopPropagation()

        // trigger the event on the bubble,
        // to position the dialog next to it.
        trigger(eventShowDialog, {
          target: btn,
        })
      })
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

    bubbleInstance.remove()
    bubbleInstance = null
  }

  removeFocusListeners()
}

export function destroy () {
  destroyInstance()
  off(eventToggleBubble, toggleBubbleHandler)
}

const bubbleSize = 28
const bubbleMargin = 5
const textfieldMinWidth = 100
const textfieldMinHeight = 32

function isValidTextfield (elem) {
  if (
    // is html element
    elem?.nodeType === Node.ELEMENT_NODE
    // is textarea or contenteditable
    && (
      (
        isTextfieldEditor(elem)
        && elem.tagName.toLowerCase() === 'textarea'
      )
      || isContentEditable(elem)
    )
  ) {
    // check if the element is big enough
    // to only show the bubble for large textfields
    const metrics = elem.getBoundingClientRect()
    if (metrics.width > textfieldMinWidth && metrics.height > textfieldMinHeight) {
      return true
    }
  }

  return false
}

function isComposedAncestor (ancestor, element) {
  let node = element
  while (node) {
    if (node === ancestor) {
      return true
    }

    const root = node.getRootNode()
    node = root instanceof ShadowRoot ? root.host : node.parentElement
  }
  return false
}

// detect if something is covering the x,y coords where we want to place the bubble.
// in case there's another element on the top-end side of the textfield
// (e.g., gmail when we compose a new email while replying in an existing thread).
// if covered, shifts the bubble toward the center of the textfield until a clear spot is found.
function occlusionHide (textfield, isRtl) {
  return {
    name: 'occlusionHide',
    fn ({ x, y, rects, middlewareData }) {
      if (middlewareData.hide?.referenceHidden) {
        return {
          data: { hidden: true },
        }
      }

      // top-end is on the right in ltr and on the left in rtl,
      // so shift toward center in each case.
      const stepDirection = isRtl ? 1 : -1
      const textfieldLeft = rects.reference.x
      const textfieldRight = rects.reference.x + rects.reference.width

      let currentX = x
      let shifted = false

      // when shifting, the bubble must stay within the bounds of the textfield
      while (isRtl ? currentX + bubbleSize <= textfieldRight : currentX >= textfieldLeft) {
        const elements = document.elementsFromPoint(currentX + bubbleSize / 2, y + bubbleSize / 2)
        const top = elements.find(el => el !== bubbleInstance)
        const occluded = (
          !!top
          // if the textfield is in a shadow root
          && !isComposedAncestor(top, textfield)
          && !textfield.contains(top)
        )

        if (!occluded) {
          // when shifted, offset() margin no longer applies on the trailing side,
          // so add it back manually to keep the gap from the occluding element.
          const finalX = shifted ? currentX + stepDirection * bubbleMargin : currentX
          return {
            x: finalX,
            data: { hidden: false },
          }
        }

        currentX += stepDirection * bubbleSize
        shifted = true
      }

      return { data: { hidden: true } }
    },
  }
}

function showBubble (textfield) {
  if (!isValidTextfield(textfield)) {
    return false
  }

  bubbleInstance.setAttribute('visible', 'true')

  const isRtl = getComputedStyle(textfield).direction === 'rtl'

  const middleware = [
    offset({
      mainAxis: -1 * (bubbleSize + bubbleMargin),
      crossAxis: -bubbleMargin,
    }),
    shift({
      crossAxis: true,
      limiter: limitShift({
        crossAxis: true,
        offset: ({rects}) => ({
          crossAxis: rects.floating.height,
        }),
      }),
      elementContext: 'reference',
    }),
    hide(),
    occlusionHide(textfield, isRtl),
  ]

  cleanupFloatingUi()

  let pollingInterval = null

  const stopPolling = () => {
    clearInterval(pollingInterval)
    pollingInterval = null
  }

  const updatePosition = () => {
    computePosition(textfield, bubbleInstance, {
      strategy: 'fixed',
      placement: 'top-end',
      middleware,
    }).then(({x, y, middlewareData}) => {
      if (!bubbleInstance) {
        return
      }

      const { hidden } = middlewareData.occlusionHide

      Object.assign(bubbleInstance.style, {
        left: `${x}px`,
        top: `${y}px`,
        visibility: hidden ? 'hidden' : 'visible',
      })

      // in case the element was hidden by the occlusion middleware,
      // because the xy coords were covered by another element,
      // start polling to check if the covering element disappears.
      if (hidden && !pollingInterval) {
        pollingInterval = setInterval(updatePosition, 1000)
      } else if (!hidden) {
        stopPolling()
      }
    })
  }

  const stopAutoUpdate = autoUpdate(textfield, bubbleInstance, updatePosition)

  cleanupFloatingUi = () => {
    stopPolling()
    stopAutoUpdate()
  }
}

function hideBubble () {
  cleanupFloatingUi()

  if (bubbleInstance) {
    bubbleInstance.removeAttribute('visible')
  }
}
