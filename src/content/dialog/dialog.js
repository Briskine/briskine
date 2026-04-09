/* global REGISTER_DISABLED */
import {render} from 'solid-js/web'
import {onMount, createSignal, createEffect} from 'solid-js'

import DialogUI from './dialog-ui.js'

import { eventShowDialog } from '../../config.js'
import {
  on as storeOn,
  off as storeOff,
} from '../../store/store-content.js'
import autocomplete from '../autocomplete.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import { isTextfieldEditor } from '../editors/editor-textfield.js'
import { getActiveElement } from '../utils/active-element.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import { getSelectionRange, setSelectionRange }  from '../utils/selection.js'
import {keybind, keyunbind} from '../keybind.js'

function scopeElementName (name = '') {
  return `${name.toLowerCase()}-${Date.now().toString(36)}`
}

let dialogInstance = null

const modalAttribute = 'modal'
const openAnimationClass = 'b-dialog-open-animation'
const listSelector = '.dialog-list'

export const dialogTagName = scopeElementName('b-dialog')

const dialogSelector = '.briskine-dialog'

function Dialog (originalProps) {

  let globalAbortController = new AbortController()
  let globalListenerOptions = {
    capture: true,
    signal: globalAbortController.signal,
  }  

  // eslint-disable-next-line no-unassigned-vars
  let element

  const [visible, setVisible] = createSignal(false)

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

  function hideOnFocusout (e) {
    if (e.target === dialogInstance) {
      setVisible(false)
    }
  }

  async function restoreSelection () {
    // will also hide dialog because of focusout
    editor.focus({ preventScroll: true })

    if (
      isContentEditable(editor)
      && cachedRange
      // if the nodes change in the editor, the range containers move to the top.
      // (e.g., linkedin message editor in shadow dom likes to re-create the
      // entire editor dom structure on focus)
      // this will also be true when the editor is empty, when focus() is enough.
      && cachedRange.startContainer !== editor
    ) {
      await setSelectionRange(editor, cachedRange)
    }
  }
  
  function stopPropagation (e, target) {
    if (
      target
      && dialogInstance
      && (
        dialogInstance === target
        || dialogInstance.shadowRoot.contains(target)
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

  onMount(() => {

    element.addEventListener('b-dialog-insert', async (e) => {
      await restoreSelection()

      autocomplete({
        template: e.detail,
      })      

      e.stopImmediatePropagation()
    })
    
    window.addEventListener('focusout', hideOnFocusout, globalListenerOptions)
    window.addEventListener('keydown', hideOnEsc, globalListenerOptions)    

    // prevent Gmail from handling keydown.
    // any keys assigned to Gmail keyboard shortcuts are prevented
    // from being inserted in the search field.
    window.addEventListener('keydown', stopTargetPropagation, globalListenerOptions)
    // prevent Front from handling keyboard shortcuts
    // when we're typing in the search field.
    window.addEventListener('keypress', stopTargetPropagation, globalListenerOptions)

    // prevent parent page from handling focus events.
    // fix interaction with our dialog in some modals (LinkedIn).
    // prevent the page from handling the focusout event when switching focus to our dialog.
    window.addEventListener('focusout', stopRelatedTargetPropagation, globalListenerOptions)
    window.addEventListener('focusin', stopTargetPropagation, globalListenerOptions)    

    
    // expose show on element
    element.show = show
  })

  createEffect((prev) => {
    if (
      visible() === true
      && prev === false
    ) {
      // activate the first item in the list
      const $list = element.querySelector(listSelector)
      if ($list) {
        $list.dispatchEvent(new Event('b-dialog-select-first'))
      }

      element.classList.add(openAnimationClass)
    } else if (
      visible() === false
      && prev == true
    ) {
      element.classList.remove(openAnimationClass)

      window.requestAnimationFrame(() => {
        /*
        // clear the search query
        if (searchField) {
          searchField.value = ''
        }

        setSearchQuery('') 
        */

        // close modals
        element.removeAttribute(modalAttribute)
      })
    }

    return visible()
  }, false)

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

  return (
    <div
      ref={element}
      class="briskine-dialog"
      classList={{
        'briskine-dialog-visible': visible(),
      }}
      >
        <DialogUI 
          keyboardShortcut={this.keyboardShortcut} 
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
