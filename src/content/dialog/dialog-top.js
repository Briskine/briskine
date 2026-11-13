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

    // modal, to show and work above modal dialogs on the page
    try {
      element.showModal()
    } catch (err) {
      debug(['dialog showModal', err], 'error')
      return false
    }

    setVisible(true)
    getDialogPosition(details.rect, element, details.placement).then((position) => {
      Object.assign(element.style, {
        top: `${position.top}px`,
        left: `${position.left}px`,
      })
    })

    return true
  }

  // the template to insert, when the dialog closes
  let closeTemplate = null

  function close (template) {
    closeTemplate = template
    element.close()
  }

  // the frame of the editor restores its focus and selection,
  // and inserts the template.
  function notifyClose (template) {
    relay({
      event: eventDialogClose,
      details: {template},
      frameId: frameId,
    }).catch((err) => {
      debug(['dialog close', err], 'error')
    })
  }

  // every way of closing the dialog
  function handleClose () {
    setVisible(false)
    notifyClose(closeTemplate)
    closeTemplate = null
  }

  // clicks outside the dialog land on its backdrop
  function closeOnBackdropClick (e) {
    const {top, left, right, bottom} = element.getBoundingClientRect()
    if (
      e.target === element
      && (e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom)
    ) {
      close()
    }
  }

  // escape, or other close requests (e.g. the android back button)
  function closeOnCancel (e) {
    e.preventDefault()
    // focus is back in the editor on keyup.
    // some websites (eg. linkedin) close their modal on the escape keyup.
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
      }
    }, { capture: true, once: true })

    close()
  }

  let globalAbortController
  onMount(() => {
    globalAbortController = new AbortController()

    element.addEventListener('close', handleClose)
    element.addEventListener('cancel', closeOnCancel)
    element.addEventListener('click', closeOnBackdropClick)

    stopPageEvents(element, globalAbortController.signal)

    // expose show on element
    element.showDialog = show
  })

  onCleanup(() => {
    globalAbortController.abort()

    // removing the open dialog doesn't fire the close event
    if (visible()) {
      notifyClose()
    }
  })

  return (
    <dialog
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
    </dialog>
  )
}

customElements.define(dialogTagName, class extends HTMLElement {
  #shadowRoot = null

  constructor () {
    super()

    this.disposer = () => {}

    this.show = function (details) {
      return this.#shadowRoot.querySelector(dialogSelector).showDialog(details)
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

export function respondToShow (details = {}) {
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
