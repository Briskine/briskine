/* global REGISTER_DISABLED */
import {customElement} from 'solid-element'
import {Show, onMount, onCleanup, createSignal, createEffect} from 'solid-js'

import config from '../../config.js'
import store from '../../store/store-content.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import {autocomplete, getSelectedWord, getSelection, getEventTarget} from '../autocomplete.js'
import {keybind, keyunbind} from '../keybind.js'
import IconSearch from 'bootstrap-icons/icons/search.svg'
import IconBriskine from '../../icons/briskine-logo-small.svg'

import DialogFooter from './dialog-footer.js'
import DialogList from './dialog-list.js'
import DialogTemplates from './dialog-templates.js'
import DialogSettings from './dialog-settings.js'
import DialogActions from './dialog-actions.js'

import styles from './dialog.css'

function scopeElementName (name = '') {
  return `${name.toLowerCase()}-${Date.now().toString(36)}`
}

let dialogInstance = null

export const dialogTagName = scopeElementName('b-dialog')

const modalAttribute = 'modal'
const dialogVisibleAttr = 'visible'
const openAnimationClass = 'b-dialog-open-animation'
const listSelector = '.dialog-list'

customElement(dialogTagName, {
  keyboardShortcut: '',
  visible: false,
}, (props, {element}) => {

  const [loggedIn, setLoggedIn] = createSignal()
  const [loading, setLoading] = createSignal()
  const [templates, setTemplates] = createSignal([])
  const [tags, setTags] = createSignal([])
  const [extensionData, setExtensionData] = createSignal({})

  const [searchResults, setSearchResults] = createSignal([])
  const [searchQuery, setSearchQuery] = createSignal('')

  let editor
  let word
  let searchField

  let anchorNode = null
  let anchorOffset = 0
  let focusNode = null
  let focusOffset = 0

  createEffect(() => {
    if (props.visible === true) {
      element.classList.add(openAnimationClass)

      // activate the first item in the list
      const $list = element.shadowRoot.querySelector(listSelector)
      if ($list) {
        $list.dispatchEvent(new Event('b-dialog-select-first'))
      }
    } else {
      element.classList.remove(openAnimationClass)

      window.requestAnimationFrame(() => {
        // clear the search query
        if (searchField) {
          searchField.value = ''
        }

        setSearchQuery('')
        // close modals
        element.removeAttribute(modalAttribute)
      })
    }
  })

  function show (e) {
    // dialog is already visible
    if (element.hasAttribute(dialogVisibleAttr)) {
      return
    }

    let target
    let removeCaretParent = false
    let placement = 'top-left'

    let node = getEventTarget(e)

    // detect rtl
    const targetStyle = window.getComputedStyle(node)
    const direction = targetStyle.direction || 'ltr'
    element.setAttribute('dir', direction)

    anchorNode = null
    anchorOffset = 0
    focusNode = null
    focusOffset = 0

    if (isTextfield(element)) {
      // input, textarea
      target = getEditableCaret(node)
      removeCaretParent = true
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
        } else {
          placement = 'top-left'
        }
      }
    } else if (e.target.tagName.toLowerCase() === bubbleTagName) {
      // bubble
      target = e.target
      if (direction === 'rtl') {
        placement = 'bottom-left'
      } else {
        placement = 'bottom-right-flip'
      }
    } else {
      return
    }

    // prevent capturing keystrokes by the parent
    e.stopPropagation()
    e.preventDefault()

    // cache selection details, to restore later
    const selection = getSelection(node)
    anchorNode = selection.anchorNode
    anchorOffset = selection.anchorOffset
    focusNode = selection.focusNode
    focusOffset = selection.focusOffset

    // cache editor,
    // to use for inserting templates or restoring later.
    editor = document.activeElement
    // support having the activeElement inside a shadow root
    if (editor.shadowRoot) {
      editor = editor.shadowRoot.activeElement
    }

    word = getSelectedWord({
      element: editor
    })

    element.setAttribute(dialogVisibleAttr, true)
    const position = getDialogPosition(target, element, placement)
    element.style.top = `${position.top}px`
    element.style.left = `${position.left}px`

    // clean-up the virtual caret mirror,
    // used on input and textarea
    if (removeCaretParent) {
      target.parentNode.remove()
    }

    // give it a second before focusing.
    // in production, the search field is not focused on some websites (eg. google sheets, salesforce).
    setTimeout(() => {
      searchField.focus()
    })

    if (loading() === true) {
      loadData()
    }
  }

  element.show = show

  function insertTemplate (id = '') {
    restoreSelection()

    // get template from cache
    const template = templates().find((t) => t.id === id)

    autocomplete({
      quicktext: template,
      element: editor,
      word: word,
    })

    // close dialog
    element.removeAttribute(dialogVisibleAttr)
  }

  function stopPropagation (e, target) {
    if (target && (element === target || element.shadowRoot.contains(target))) {
      e.stopPropagation()
    }
  }

  function stopTargetPropagation (e) {
    stopPropagation(e, e.target)
  }

  function stopRelatedTargetPropagation (e) {
    stopPropagation(e, e.relatedTarget)
  }

  async function templatesUpdated () {
    setTemplates(await store.getTemplates())
  }

  async function tagsUpdated () {
    setTags(await store.getTags())
  }

  function extensionDataUpdated (data) {
    setExtensionData(data)
  }

  async function loadData () {
    const extensionData = await store.getExtensionData()
    extensionDataUpdated(extensionData)

    await templatesUpdated()
    await tagsUpdated()

    setLoading(false)
  }

  function setAuthState () {
    store.getAccount()
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
    .then((status) => {
      setLoggedIn(status)
      setLoading(true)

      // only start loading data if the dialog is visible
      if (element.hasAttribute(dialogVisibleAttr)) {
        loadData()
      }
    })
  }

  function handleSearchFieldShortcuts (e) {
    // only handle events from the search field
    const composedPath = e.composedPath()
    const composedTarget = composedPath[0]
    const $list = element.shadowRoot.querySelector(listSelector)
    if (
      e.target !== element ||
      composedTarget !== searchField ||
      !['Enter', 'ArrowDown', 'ArrowUp'].includes(e.key) ||
      !$list
    ) {
      return
    }

    if (e.key === 'Enter') {
      $list.dispatchEvent(new Event('b-dialog-select-active'))
      return e.preventDefault()
    }

    let move
    if (e.key === 'ArrowDown') {
      move = 'next'
    } else if (e.key === 'ArrowUp') {
      move = 'previous'
    }

    if (move) {
      $list.dispatchEvent(new CustomEvent('b-dialog-select', {
        detail: move,
      }))
      // prevent moving the cursor to the start/end of the search field
      e.preventDefault()
    }
  }

  function restoreSelection () {
    // only try to restore the selection on contenteditable.
    // input and textarea will restore the correct range with focus().
    if (
      isContentEditable(editor) &&
      anchorNode &&
      focusNode
    ) {
      window.getSelection().setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
    } else {
      editor.focus()
    }
  }

  function hideOnClick (e) {
    if (
      // clicking inside the dialog
      !element.contains(e.target) &&
      element.hasAttribute(dialogVisibleAttr) &&
      // clicking the bubble
      e.target.tagName.toLowerCase() !== bubbleTagName
    ) {
      element.removeAttribute(dialogVisibleAttr)
    }
  }

  function hideOnEsc (e) {
    if (e.key === 'Escape' && element.hasAttribute(dialogVisibleAttr)) {
      e.stopPropagation()
      // prevent triggering the keyup event on the page.
      // causes some websites (eg. linkedin) to also close the underlying modal
      // when closing our dialog.
      window.addEventListener('keyup', (e) => { e.stopPropagation() }, { capture: true, once: true })

      element.removeAttribute(dialogVisibleAttr)
      restoreSelection()
    }
  }

  onMount(() => {
    // check authentication state
    setAuthState()
    store.on('login', setAuthState)
    store.on('logout', setAuthState)

    store.on('templates-updated', templatesUpdated)
    store.on('tags-updated', tagsUpdated)
    store.on('extension-data-updated', extensionDataUpdated)

    let searchDebouncer
    searchField = element.shadowRoot.querySelector('input[type=search]')

    // search for templates
    searchField.addEventListener('input', (e) => {
      if (searchDebouncer) {
        clearTimeout(searchDebouncer)
      }

      const searchValue = e.target.value
      if (searchValue) {
        searchDebouncer = setTimeout(async () => {
          const {query, results} = await store.searchTemplates(searchValue)
          if (query === searchValue) {
            setSearchQuery(searchValue)
            setSearchResults(results)
          }
        }, 50)
      } else {
        setSearchQuery('')
      }
    })

    // keyboard navigation and insert for templates
    window.addEventListener('keydown', handleSearchFieldShortcuts, true)
    element.addEventListener('b-dialog-insert', (e) => {
      insertTemplate(e.detail)
    })

    element.addEventListener('click', (e) => {
      const composedPath = e.composedPath()
      const composedTarget = composedPath[0]

      // open and close modals
      const btnModalAttribute = 'data-b-modal'
      const modalBtn = composedTarget.closest(`[${btnModalAttribute}]`)
      if (modalBtn) {
        const modal = modalBtn.getAttribute(btnModalAttribute)
        if (element.getAttribute(modalAttribute) !== modal) {
          element.setAttribute(modalAttribute, modal)
        } else {
          element.removeAttribute(modalAttribute)

          // focus the search field when closing the modals,
          // and returning to the list view.
          if (searchField) {
            searchField.focus()
          }
        }
      }

      // login button
      if (composedTarget.closest('.dialog-login-btn')) {
        e.preventDefault()
        store.openPopup()
        element.removeAttribute(dialogVisibleAttr)
      }
    })

    window.addEventListener('click', hideOnClick, true)
    window.addEventListener('keydown', hideOnEsc, true)

    // prevent Gmail from handling keydown.
    // any keys assigned to Gmail keyboard shortcuts are prevented
    // from being inserted in the search field.
    window.addEventListener('keydown', stopTargetPropagation, true)
    // prevent Front from handling keyboard shortcuts
    // when we're typing in the search field.
    window.addEventListener('keypress', stopTargetPropagation, true)

    // prevent parent page from handling focus events.
    // fix interaction with our dialog in some modals (LinkedIn, Twitter).
    // prevent the page from handling the focusout event when switching focus to our dialog.
    window.addEventListener('focusout', stopRelatedTargetPropagation, true)
    window.addEventListener('focusin', stopTargetPropagation, true)
  })

  onCleanup(() => {
    window.removeEventListener('click', hideOnClick, true)
    window.removeEventListener('keydown', hideOnEsc, true)
    window.removeEventListener('keydown', handleSearchFieldShortcuts, true)

    store.off('login', setAuthState)
    store.off('logout', setAuthState)

    store.off('templates-updated', templatesUpdated)
    store.off('tags-updated', tagsUpdated)
    store.off('extension-data-updated', extensionDataUpdated)

    window.removeEventListener('keydown', stopTargetPropagation, true)
    window.removeEventListener('keypress', stopTargetPropagation, true)

    window.removeEventListener('focusout', stopRelatedTargetPropagation, true)
    window.removeEventListener('focusin', stopTargetPropagation, true)
  })

  return (
    <>
      <style>{styles}</style>
      <div
        classList={{
          'dialog-container': true,
          'dialog-safari': REGISTER_DISABLED,
        }}
        tabindex="-1"
        >

        <div class="dialog-search">
          <input type="search" value="" placeholder="Search templates..." spellcheck="false" />
          <div class="dialog-search-icon">
            <IconSearch />
          </div>
        </div>

        <div class="dialog-content">
          <Show when={!loggedIn()}>
            <div class="dialog-info d-flex">
              <div class="dialog-info-icon">
                <IconBriskine />
              </div>
              <div>
                <a href="" class="dialog-login-btn">Sign in</a>
                to Briskine to access your templates.
              </div>
            </div>
          </Show>

          <Show
            when={searchQuery()}
            fallback={(
              <DialogTemplates
                loggedIn={loggedIn()}
                loading={loading()}
                templates={templates()}
                tags={tags()}
                extensionData={extensionData()}
                />
            )}
            >
            <DialogList
              loggedIn={loggedIn()}
              list={searchResults()}
              showTags={extensionData().dialogTags}
              tags={tags()}
              />
          </Show>
        </div>

        <Show when={loggedIn()}>
          <DialogFooter shortcut={props.keyboardShortcut} />
          <DialogSettings extensionData={extensionData()} />
          <DialogActions />
        </Show>
      </div>
    </>
  )
})

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

function createDialog (settings = {}) {
  const instance = document.createElement(dialogTagName)
  instance.keyboardShortcut = settings.dialog_shortcut
  document.documentElement.appendChild(instance)

  return instance
}

let settingsCache = {}
function createAndShow (e) {
  if (!dialogInstance) {
    dialogInstance = createDialog(settingsCache)
  }
  return dialogInstance.show(e)
}

export function setup (settings = {}) {
  if (settings.dialog_enabled === false) {
    return
  }

  settingsCache = settings
  keybind(settingsCache.dialog_shortcut, createAndShow)
  window.addEventListener(config.eventShowDialog, createAndShow)
}

export function destroy () {
  keyunbind(settingsCache.dialog_shortcut, createAndShow)
  window.removeEventListener(config.eventShowDialog, createAndShow)

  if (dialogInstance) {
    dialogInstance.remove()
    dialogInstance = null
  }
}
