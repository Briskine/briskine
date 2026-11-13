/*
 * Template dialog, in the top frame.
 *
 * Opens next to the editor, even when the editor is in an iframe,
 * and asks the frame of the editor to insert the template.
 */

import {onMount, onCleanup, createSignal, createEffect} from 'solid-js'
import {render} from 'solid-js/web'

import DialogContent from './dialog-content.js'

import { eventDialogShow, eventDialogClose, frameRelayRequest, dialogTagPrefix } from '../../config.js'
import { on, off, createRequest } from '../../store/store-content.js'
import { getDialogPosition } from './dialog-position.js'
import stopPageEvents from '../utils/stop-page-events.js'
import { scopeTagName } from '../utils/extension-element.js'
import debug from '../../debug.js'

const relay = createRequest(frameRelayRequest)

let dialogInstance = null

const dialogTagName = scopeTagName(dialogTagPrefix)

const openAnimationClass = 'b-dialog-open-animation'
const dialogSelector = '.briskine-dialog'

function Dialog () {
  let element = null

  const [visible, setVisible] = createSignal(false)
  const [keyboardShortcut, setKeyboardShortcut] = createSignal('')
  // the frame of the editor
  let frameId = null

  createEffect((prev) => {
    if (
      visible() === true
      && prev === false
    ) {
      element.classList.add(openAnimationClass)
    } else if (
      visible() === false
      && prev == true
    ) {
      element.classList.remove(openAnimationClass)
    }

    return visible()
  }, false)

  function show (details = {}) {
    // dialog is already visible
    if (visible()) {
      return false
    }

    frameId = details.frameId
    setKeyboardShortcut(details.keyboardShortcut || '')
    element.setAttribute('dir', details.direction || 'ltr')

    setVisible(true)
    const position = getDialogPosition(details.rect, element, details.placement)
    Object.assign(element.style, {
      top: `${position.top}px`,
      left: `${position.left}px`,
    })

    return true
  }

  // the frame of the editor restores its focus and selection,
  // and inserts the template.
  function close (template) {
    setVisible(false)

    relay({
      event: eventDialogClose,
      details: {template},
      frameId: frameId,
    }).catch((err) => {
      debug(['dialog close', err], 'error')
    })
  }

  function hideOnFocusout (e) {
    if (e.target === dialogInstance) {
      setVisible(false)
    }
  }

  function hideOnEsc (e) {
    if (e.key === 'Escape' && visible()) {
      e.stopPropagation()
      // prevent triggering the keyup event on the page.
      // causes some websites (eg. linkedin) to also close the underlying modal
      // when closing our dialog.
      window.addEventListener('keyup', (e) => { e.stopPropagation() }, { capture: true, once: true })

      close()
    }
  }

  let globalAbortController
  onMount(() => {
    globalAbortController = new AbortController()
    const globalListenerOptions = {
      capture: true,
      signal: globalAbortController.signal,
    }

    window.addEventListener('focusout', hideOnFocusout, globalListenerOptions)
    window.addEventListener('keydown', hideOnEsc, globalListenerOptions)

    stopPageEvents(element, globalAbortController.signal)

    // expose show on element
    element.show = show
  })

  onCleanup(() => {
    globalAbortController.abort()
  })

  return (
    <div
      ref={element}
      class="briskine-dialog briskine-ui"
      classList={{
        'briskine-dialog-visible': visible(),
      }}
      >
        <DialogContent
          keyboardShortcut={keyboardShortcut()}
          visible={visible()}
          onInsert={close}
        />
    </div>
  )
}

customElements.define(dialogTagName, class extends HTMLElement {
  #shadowRoot = null

  constructor () {
    super()

    this.disposer = () => {}

    this.show = function (details) {
      return this.#shadowRoot.querySelector(dialogSelector).show(details)
    }
  }
  connectedCallback () {
    if (!this.isConnected) {
      return
    }

    // the page can remove and add our element again
    this.#shadowRoot ??= this.attachShadow({mode: 'closed'})
    this.disposer = render(() => (
      <div class="briskine-dialog-popover">
        <Dialog />
      </div>
    ), this.#shadowRoot)
  }
  disconnectedCallback () {
    this.disposer()
  }
})

function respondToShow (details = {}) {
  dialogInstance ??= document.createElement(dialogTagName)
  if (!dialogInstance.isConnected) {
    document.documentElement.appendChild(dialogInstance)
  }

  return dialogInstance.show(details)
}

export function setup () {
  // dialogs from every frame show in the top one
  if (window !== window.top) {
    return
  }

  on(eventDialogShow, respondToShow)
}

export function destroy () {
  off(eventDialogShow, respondToShow)

  dialogInstance?.remove()
  dialogInstance = null
}
