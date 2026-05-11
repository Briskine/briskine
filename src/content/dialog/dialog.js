import {onMount, onCleanup, createSignal, createEffect, mergeProps} from 'solid-js'
import {render} from 'solid-js/web'

import DialogContent from './dialog-content.js'

import { eventShowDialog } from '../../config.js'
import {
  on as storeOn,
  off as storeOff,
} from '../../store/store-content.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import autocomplete from '../autocomplete.js'
import { getSelectionRange, setSelectionRange }  from '../utils/selection.js'
import { getActiveElement } from '../utils/active-element.js'
import {keybind, keyunbind} from '../keybind.js'

function scopeElementName (name = '') {
  return `${name.toLowerCase()}-${Date.now().toString(36)}`
}

let dialogInstance = null

export const dialogTagName = scopeElementName('b-dialog')

const openAnimationClass = 'b-dialog-open-animation'
const dialogSelector = '.briskine-dialog'

function Dialog (originalProps) {
  const props = mergeProps({
    keyboardShortcut: '',
  }, originalProps)

  // eslint-disable-next-line no-unassigned-vars
  let element

  const [visible, setVisible] = createSignal(false)
  let editor
  let cachedRange

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

  function show (node) {
    // dialog is already visible
    if (visible()) {
      return
    }

    // if not triggered on a specific element, get the active element.
    // node is defined only when opened from the bubble.
    if (!node) {
      node = getActiveElement()
    }

    let target
    let removeCaretParent
    let placement = 'top-left'

    // detect rtl
    const targetStyle = window.getComputedStyle(node)
    const direction = targetStyle.direction || 'ltr'
    element.setAttribute('dir', direction)

    cachedRange = null

    // when event was triggered in shadow dom (such as the bubble)
    const hostNode = node?.getRootNode?.()?.host

    if (isTextfieldEditor(node)) {
      // input, textarea
      [target, removeCaretParent] = getEditableCaret(node)
      if (direction === 'rtl') {
        placement = 'bottom-left-flip'
      } else {
        placement = 'bottom-right'
      }
    } else if (isContentEditable(node)) {
      // contenteditable
      target = getContentEditableCaret(node)

      if (target.collapsed === false && ! node.hasAttribute('g_editable')) {
        return
      }

      // only use the targetMetrics width when caret is a range.
      // workaround for when the contenteditable caret is the endContainer.
      const isRange = target instanceof Range

      if (direction === 'rtl') {
        if (isRange) {
          placement = 'bottom-left-flip'
        } else {
          placement = 'top-right-flip'
        }
      } else {
        if (isRange) {
          placement = 'bottom-right'
        }
      }
    } else if (hostNode?.tagName?.toLowerCase?.() === bubbleTagName) {
      // bubble
      target = node
      if (direction === 'rtl') {
        placement = 'bottom-left'
      } else {
        placement = 'bottom-right-flip'
      }
    } else {
      return
    }

    // cache editor,
    // to use for restoring selection and inserting templates later.
    editor = getActiveElement()

    // cache selection details, to restore later
    cachedRange = getSelectionRange(editor)

    setVisible(true)
    const position = getDialogPosition(target, element, placement)
    element.style.top = `${position.top}px`
    element.style.left = `${position.left}px`

    // clean-up the virtual caret mirror,
    // used on input and textarea
    if (removeCaretParent) {
      removeCaretParent()
    }
  }

  function stopPropagation (e, target) {
    if (
      target
      && dialogInstance
      && (
        dialogInstance === target
        || dialogInstance === target?.getRootNode?.()?.host
      )
    ) {
      e.stopPropagation()
    }
  }

  function stopTargetPropagation (e) {
    stopPropagation(e, e.target)
  }

  function stopRelatedTargetPropagation (e) {
    stopPropagation(e, e.relatedTarget)
  }


    async function restoreSelection () {
    // will also hide dialog because of focusout
    editor.focus({ preventScroll: true })

    if (
      isContentEditable(editor)
      && cachedRange
      // if all the nodes are destroyed in the editor, the range resets and moves to the top.
      // (e.g., linkedin message editor in shadow dom likes to re-create the
      // entire editor dom structure on focus)
      // this will also be true when the editor is empty, when focus() is enough.
      && !(
        cachedRange.startContainer === editor
        && cachedRange.collapsed === true
        && cachedRange.startOffset === 0
      )
    ) {
      await setSelectionRange(editor, cachedRange)
    }
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

      restoreSelection()
    }
  }

  let globalAbortController
  onMount(() => {
    globalAbortController = new AbortController()
    const globalListenerOptions = {
      capture: true,
      signal: globalAbortController.signal,
    }

    element.addEventListener('b-dialog-insert', async (e) => {
      await restoreSelection()

      autocomplete({
        template: e.detail,
      })

      e.stopImmediatePropagation()
    })

    window.addEventListener('focusout', hideOnFocusout, globalListenerOptions)
    window.addEventListener('keydown', hideOnEsc, globalListenerOptions)

    // prevent parent page from handling composed events.
    // fix interaction with our dialog in some modals (Gmail, LinkedIn new post, GitHub search).
    const stopTargetEvents = [
      // stop Gmail from preventing keys assigned to Gmail shortcuts to be typed
      // inside the dialog search field
      'keydown',
      'keyup',
      // stop Front from catching keyboard shortcuts when typing in the dialog
      'keypress',
      // stop GitHub search from closing the dialog when clicking inside it
      'mousedown',
      'mouseup',
      // stop GitHub search from preventing opening the dialog
      // stop LinkedIn New Post from stealing focus when opening the dialog
      'focus',
      'focusin',
    ]

    const stopRelatedTargetEvents = [
      // stop GitHub search and LinkedIn new post from handling blur
      'blur',
      'focusout',
    ]

    stopTargetEvents.forEach((event) => {
      window.addEventListener(event, stopTargetPropagation, globalListenerOptions)
    })

    stopRelatedTargetEvents.forEach((event) => {
      window.addEventListener(event, stopRelatedTargetPropagation, globalListenerOptions)
    })

    // expose show on element
    element.show = show
  })

  onCleanup(() => {
    globalAbortController.abort()
  })

  return (
    <div
      ref={element}
      class="briskine-dialog"
      classList={{
        'briskine-dialog-visible': visible(),
      }}
      >
        <DialogContent
          keyboardShortcut={props.keyboardShortcut}
          visible={visible()}
        />
    </div>
  )
}

customElements.define(dialogTagName, class extends HTMLElement {
  constructor () {
    super()

    this.keyboardShortcut = ''
    this.disposer = () => {}

    this.show = function (target) {
      this.shadowRoot.querySelector(dialogSelector).show(target)
    }
  }
  connectedCallback () {
    if (!this.isConnected) {
      return
    }

    this.attachShadow({mode: 'open'})
    this.disposer = render(() => (
      <Dialog keyboardShortcut={this.keyboardShortcut} />
    ), this.shadowRoot)
  }
  disconnectedCallback () {
    this.disposer()
  }
})

function createDialog (settings = {}) {
  const instance = document.createElement(dialogTagName)
  instance.keyboardShortcut = settings.dialog_shortcut
  document.documentElement.appendChild(instance)

  return instance
}

let settingsCache = {}
function createAndShow ({ target } = {}) {
  if (!dialogInstance) {
    dialogInstance = createDialog(settingsCache)
  }
  return dialogInstance.show(target)
}

function keyboardCreateAndShow (e) {
  // prevent capturing keystrokes by the parent
  e.stopPropagation()
  e.preventDefault()

  createAndShow()
}

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  settingsCache = settings
  keybind(settingsCache.dialog_shortcut, keyboardCreateAndShow)
  storeOn(eventShowDialog, createAndShow)
}

export function destroy () {
  keyunbind(settingsCache.dialog_shortcut, keyboardCreateAndShow)
  storeOff(eventShowDialog, createAndShow)

  if (dialogInstance) {
    dialogInstance.remove()
    dialogInstance = null
  }
}
