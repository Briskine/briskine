/* global REGISTER_DISABLED */
import browser from 'webextension-polyfill'
import {render} from 'lit-html'
import {html, unsafeStatic} from 'lit-html/static.js'
import {classMap} from 'lit-html/directives/class-map.js'

import store from '../../store/store-client.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import {bubbleTagName} from '../bubble/bubble.js'
import {getEditableCaret, getContentEditableCaret, getDialogPosition} from './dialog-position.js'
import {autocomplete, getSelectedWord, getSelection, getEventTarget} from '../autocomplete.js'
import {keybind, keyunbind} from '../keybind.js'
import {batch, reactive} from '../component.js'

import config from '../../config.js'

import DialogFooter from './dialog-footer.js'
import DialogSettings from './dialog-settings.js'
import DialogTemplates from './dialog-templates.js'
import DialogList from './dialog-list.js'

import styles from './dialog.css'

function scopeElementName (name = '') {
  return `${name.toLowerCase()}-${Date.now().toString(36)}`
}

function scopedComponent (componentClass) {
  const tagName = scopeElementName(`b-${componentClass.name}`)
  customElements.define(tagName, componentClass)

  return {
    component: unsafeStatic(tagName),
    tagName: tagName,
  }
}

const {component: templatesComponent} = scopedComponent(DialogTemplates)
const {component: footerComponent} = scopedComponent(DialogFooter)
const {component: settingsComponent} = scopedComponent(DialogSettings)
const {component: listComponent, tagName: listComponentTagName} = scopedComponent(DialogList)

const dialogStyles = unsafeStatic(styles)

let dialogInstance = null

export const dialogShowEvent = 'briskine-dialog'
export const dialogTagName = scopeElementName('b-dialog')

const modalAttribute = 'modal'
const dialogVisibleAttr = 'visible'
const openAnimationClass = 'b-dialog-open-animation'
const listSelector = '.dialog-list'

// action.openPopup is not supported in all browsers yet.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/openPopup
// Open the action popup in a new tab.
const popupUrl = browser.runtime.getURL('popup/popup.html')
const signupUrl = `${config.websiteUrl}/signup`

customElements.define(
  dialogTagName,
  class extends HTMLElement {
    constructor () {
      super()

      this.state = reactive({
        loggedIn: false,
        loading: true,
        templates: [],
        tags: [],
        extensionData: {},
        keyboardShortcut: '',
        searchQuery: '',
        searchResults: [],
      }, this, () => {
        this.render()
      })

      this.searchField = null

      this.editor = null
      this.word = null
      // selection cache, to restore later
      this.focusNode = null
      this.focusOffset = 0
      this.anchorNode = null
      this.anchorOffset = 0

      this.show = (e) => {
        // dialog is already visible
        if (this.hasAttribute(dialogVisibleAttr)) {
          return
        }

        let target
        let removeCaretParent = false
        let placement = 'top-left'

        let element = getEventTarget(e)

        // detect rtl
        const targetStyle = window.getComputedStyle(element)
        const direction = targetStyle.direction || 'ltr'
        this.setAttribute('dir', direction)

        this.anchorNode = null
        this.anchorOffset = 0
        this.focusNode = null
        this.focusOffset = 0

        if (isTextfield(element)) {
          // input, textarea
          target = getEditableCaret(element)
          removeCaretParent = true
          if (direction === 'rtl') {
            placement = 'bottom-left-flip'
          } else {
            placement = 'bottom-right'
          }
        } else if (isContentEditable(element)) {
          // contenteditable
          target = getContentEditableCaret(element)

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
        const selection = getSelection(element)
        this.anchorNode = selection.anchorNode
        this.anchorOffset = selection.anchorOffset
        this.focusNode = selection.focusNode
        this.focusOffset = selection.focusOffset

        // cache editor,
        // to use for inserting templates or restoring later.
        this.editor = document.activeElement
        // support having the activeElement inside a shadow root
        if (this.editor.shadowRoot) {
          this.editor = this.editor.shadowRoot.activeElement
        }

        this.word = getSelectedWord({
          element: this.editor
        })

        this.setAttribute(dialogVisibleAttr, true)
        const position = getDialogPosition(target, this, placement)
        this.style.top = `${position.top}px`
        this.style.left = `${position.left}px`

        // clean-up the virtual caret mirror,
        // used on input and textarea
        if (removeCaretParent) {
          target.parentNode.remove()
        }

        // give it a second before focusing.
        // in production, the search field is not focused on some websites (eg. google sheets, salesforce).
        setTimeout(() => {
          this.searchField.focus()
        })

        if (this.loading === true) {
          this.loadData()
        }
      }

      this.hideOnClick = (e) => {
        if (
          // clicking inside the dialog
          !this.contains(e.target) &&
          this.hasAttribute(dialogVisibleAttr) &&
          // clicking the bubble
          e.target.tagName.toLowerCase() !== bubbleTagName
        ) {
          this.removeAttribute(dialogVisibleAttr)
        }
      }

      this.restoreSelection = () => {
        // only try to restore the selection on contenteditable.
        // input and textarea will restore the correct range with focus().
        if (
          isContentEditable(this.editor) &&
          this.anchorNode &&
          this.focusNode
        ) {
          window.getSelection().setBaseAndExtent(this.anchorNode, this.anchorOffset, this.focusNode, this.focusOffset)
        } else {
          this.editor.focus()
        }
      }

      this.insertTemplate = (id = '') => {
        this.restoreSelection()

        // get template from cache
        const template = this.templates.find((t) => t.id === id)

        autocomplete({
          quicktext: template,
          element: this.editor,
          word: this.word,
        })

        // close dialog
        this.removeAttribute(dialogVisibleAttr)
      }

      this.setAuthState = () => {
        store.getAccount()
          .then(() => {
            return true
          })
          .catch(() => {
            return false
          })
          .then((loggedIn) => {
            this.loggedIn = loggedIn
            this.loading = true

            // only start loading data if the dialog is visible
            if (this.hasAttribute(dialogVisibleAttr)) {
              this.loadData()
            }
          })
      }

      this.hideOnEsc = (e) => {
        if (e.key === 'Escape' && this.hasAttribute(dialogVisibleAttr)) {
          e.stopPropagation()
          // prevent triggering the keyup event on the page.
          // causes some websites (eg. linkedin) to also close the underlying modal
          // when closing our dialog.
          window.addEventListener('keyup', (e) => { e.stopPropagation() }, { capture: true, once: true })

          this.removeAttribute(dialogVisibleAttr)
          this.restoreSelection()
        }
      }

      this.handleSearchFieldShortcuts = (e) => {
        // only handle events from the search field
        const composedPath = e.composedPath()
        const composedTarget = composedPath[0]
        const $list = this.shadowRoot.querySelector(listSelector)
        if (
          e.target !== this ||
          composedTarget !== this.searchField ||
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

      const stopPropagation = (e, target) => {
        if (target && (this === target || this.shadowRoot.contains(target))) {
          e.stopPropagation()
        }
      }

      this.stopTargetPropagation = (e) => {
        stopPropagation(e, e.target)
      }

      this.stopRelatedTargetPropagation = (e) => {
        stopPropagation(e, e.relatedTarget)
      }

      this.loadData = async () => {
        const extensionData = await store.getExtensionData()
        this.extensionDataUpdated(extensionData)

        await this.templatesUpdated()
        await this.tagsUpdated()

        this.loading = false
      }

      this.templatesUpdated = async () => {
        this.templates = await store.getTemplates()
      }

      this.tagsUpdated = async () => {
        this.tags = await store.getTags()
      }

      this.extensionDataUpdated = (data) => {
        this.extensionData = data
      }

      this.urgentRender = () => {
        render(template(this.state), this.shadowRoot)
      }

      this.render = batch(this.urgentRender)
    }
    static get observedAttributes() { return ['visible'] }
    attributeChangedCallback (name, oldValue, newValue) {
      if (name === 'visible') {
        if (newValue === 'true') {
          this.classList.add(openAnimationClass)

          // activate the first item in the list
          const $list = this.shadowRoot.querySelector(listSelector)
          if ($list) {
            $list.dispatchEvent(new Event('b-dialog-select-first'))
          }
        } else {
          this.classList.remove(openAnimationClass)

          window.requestAnimationFrame(() => {
            // clear the search query
            this.searchField.value = ''
            this.searchQuery = ''
            // close modals
            this.removeAttribute(modalAttribute)
          })
        }
      }
    }
    connectedCallback () {
      if (!this.isConnected) {
        return
      }

      this.attachShadow({mode: 'open'})
      this.urgentRender()

      // check authentication state
      this.setAuthState()
      store.on('login', this.setAuthState)
      store.on('logout', this.setAuthState)

      this.loadData()

      store.on('templates-updated', this.templatesUpdated)
      store.on('tags-updated', this.tagsUpdated)
      store.on('extension-data-updated', this.extensionDataUpdated)

      let searchDebouncer
      this.searchField = this.shadowRoot.querySelector('input[type=search]')

      // search for templates
      this.searchField.addEventListener('input', (e) => {
        if (searchDebouncer) {
          clearTimeout(searchDebouncer)
        }

        const searchValue = e.target.value
        if (searchValue) {
          searchDebouncer = setTimeout(async () => {
            const {query, results} = await store.searchTemplates(searchValue)
            if (query === searchValue) {
              this.searchQuery = searchValue
              this.searchResults = results
            }
          }, 50)
        } else {
          this.searchQuery = ''
        }
      })

      // keyboard navigation and insert for templates
      window.addEventListener('keydown', this.handleSearchFieldShortcuts, true)
      this.addEventListener('b-dialog-insert', (e) => {
        this.insertTemplate(e.detail)
      })

      this.addEventListener('b-dialog-set-modal', (e) => {
        if (e.detail && this.getAttribute(modalAttribute) !== e.detail) {
          this.setAttribute(modalAttribute, e.detail)
        } else {
          this.removeAttribute(modalAttribute)
        }
      })

      window.addEventListener('click', this.hideOnClick, true)
      window.addEventListener('keydown', this.hideOnEsc, true)

      // prevent Gmail from handling keydown.
      // any keys assigned to Gmail keyboard shortcuts are prevented
      // from being inserted in the search field.
      window.addEventListener('keydown', this.stopTargetPropagation, true)
      // prevent Front from handling keyboard shortcuts
      // when we're typing in the search field.
      window.addEventListener('keypress', this.stopTargetPropagation, true)

      // prevent parent page from handling focus events.
      // fix interaction with our dialog in some modals (LinkedIn, Twitter).
      // prevent the page from handling the focusout event when switching focus to our dialog.
      window.addEventListener('focusout', this.stopRelatedTargetPropagation, true)
      window.addEventListener('focusin', this.stopTargetPropagation, true)
    }
    disconnectedCallback () {
      window.removeEventListener('click', this.hideOnClick, true)
      window.removeEventListener('keydown', this.hideOnEsc, true)
      window.removeEventListener('keydown', this.handleSearchFieldShortcuts, true)

      store.off('login', this.setAuthState)
      store.off('logout', this.setAuthState)

      store.off('templates-updated', this.templatesUpdated)
      store.off('tags-updated', this.tagsUpdated)
      store.off('extension-data-updated', this.extensionDataUpdated)

      window.removeEventListener('keydown', this.stopTargetPropagation, true)
      window.removeEventListener('keypress', this.stopTargetPropagation, true)

      window.removeEventListener('focusout', this.stopRelatedTargetPropagation, true)
      window.removeEventListener('focusin', this.stopTargetPropagation, true)
    }
  }
)

function template({
  loggedIn,
  loading,
  templates,
  tags,
  extensionData,
  searchQuery,
  searchResults,
  keyboardShortcut,
}) {
  return html`
    <style>${dialogStyles}</style>
    <div
      class=${classMap({
        'dialog-container': true,
        'dialog-safari': REGISTER_DISABLED,
      })}
      >
      <input type="search" value="" placeholder="Search templates...">

      <div class="dialog-content">

        ${!loggedIn ? html`
          <div class="dialog-info">
            Please
            <a href="${popupUrl}?source=tab" target="_blank">Sign in</a>
            <span class="dialog-safari-hide">
              or
              <a href="${signupUrl}" target="_blank">
                Create a free account
              </a>
            </span>
            <span class="dialog-safari-show">
              to access your templates.
            </span>
          </div>
        ` : ''}

        ${searchQuery
          ? html`
            <${listComponent}
              .loggedIn=${loggedIn}
              .list=${searchResults}
              .showTags=${extensionData.dialogTags}
              .tags=${tags}
              >
            </${listComponent}>
          `
          : html`
            <${templatesComponent}
              .loggedIn=${loggedIn}
              .loading=${loading}
              .templates=${templates}
              .tags=${tags}
              .extensionData=${extensionData}
              .listComponentTagName=${listComponentTagName}
              >
            </${templatesComponent}>
          `
        }
      </div>

      ${loggedIn ? html`
        <${footerComponent}
          .shortcut=${keyboardShortcut}
          >
        </${footerComponent}>

        <${settingsComponent}
          .extensionData=${extensionData}
          >
        </${settingsComponent}>
      ` : ''}
    </div>
  `
}

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
  window.addEventListener(dialogShowEvent, createAndShow)
}

export function destroy () {
  keyunbind(settingsCache.dialog_shortcut, createAndShow)
  window.removeEventListener(dialogShowEvent, createAndShow)

  if (dialogInstance) {
    dialogInstance.remove()
    dialogInstance = null
  }
}
