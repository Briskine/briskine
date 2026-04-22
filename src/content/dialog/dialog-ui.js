/* global REGISTER_DISABLED */
import {Show, onMount, onCleanup, createSignal, createEffect, mergeProps} from 'solid-js'

import {
  getTemplates,
  getTags,
  getAccount,
  getExtensionData,
  on as storeOn,
  off as storeOff,
  searchTemplates,
  openPopup,
} from '../../store/store-content.js'

import IconSearch from 'bootstrap-icons/icons/search.svg'
import IconBriskine from '../../icons/briskine-logo-small.svg'

import DialogFooter from './dialog-footer.js'
import DialogList from './dialog-list.js'
import DialogTemplates from './dialog-templates.js'
import DialogSettings from './dialog-settings.js'
import DialogActions from './dialog-actions.js'

import styles from './dialog.css'

const listSelector = '.dialog-list'

export default function DialogUI (originalProps) {
  const props = mergeProps({
    keyboardShortcut: '',
    visible: false,
  }, originalProps)

  // eslint-disable-next-line no-unassigned-vars
  let element

  // eslint-disable-next-line no-unassigned-vars  
  let elementDialogList

  // eslint-disable-next-line no-unassigned-vars
  let searchField

  // duplicate
  let globalAbortController = new AbortController()
  let globalListenerOptions = {
    capture: true,
    signal: globalAbortController.signal,
  }    

  const [loggedIn, setLoggedIn] = createSignal()
  const [loading, setLoading] = createSignal()
  const [templates, setTemplates] = createSignal([])
  const [tags, setTags] = createSignal([])
  const [extensionData, setExtensionData] = createSignal({})

  const [searchResults, setSearchResults] = createSignal([])
  const [searchQuery, setSearchQuery] = createSignal('')

  const modalAttribute = 'modal'

  createEffect((prev) => {
    if (
      props.visible === true
      && prev === false
    ) {
      // activate the first item in the list
      const $list = elementDialogList
      if ($list) {
        $list.dispatchEvent(new Event('b-dialog-select-first'))
      }

      // give it a second before focusing.
      // in production, the search field is not focused on some websites (eg. google sheets, salesforce).
      setTimeout(() => {
        searchField.focus({ preventScroll: true })
      })

      if (loading() === true) {
        loadData()
      }
    } else if (
      props.visible === false
      && prev == true
    ) {

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

    return props.visible
  }, false)

  async function templatesUpdated (templates = []) {
    setTemplates(templates)
  }

  async function tagsUpdated (tags = []) {
    setTags(tags)
  }

  function extensionDataUpdated (data = {}) {
    setExtensionData(data)
  }

  async function loadData () {
    const extensionData = await getExtensionData()
    extensionDataUpdated(extensionData)

    setTemplates(await getTemplates())
    setTags(await getTags())

    setLoading(false)
  }

  function setAuthState () {
    getAccount()
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
      if (props.visible) {
        loadData()
      }
    })
  }

  function handleSearchFieldShortcuts (e) {
    // only handle events from the search field
    const target = e.composedPath()[0]
    const $list = element.querySelector(listSelector)
    if (
      target !== searchField ||
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

  onMount(() => {
    // check authentication state
    setAuthState()
    storeOn('login', setAuthState)
    storeOn('logout', setAuthState)

    storeOn('templates-updated', templatesUpdated)
    storeOn('tags-updated', tagsUpdated)
    storeOn('extension-data-updated', extensionDataUpdated)

    let searchDebouncer
    // searchField = element.querySelector('input[type=search]')

    // search for templates
    searchField.addEventListener('input', (e) => {
      if (searchDebouncer) {
        clearTimeout(searchDebouncer)
      }

      const searchValue = e.target.value
      if (searchValue) {
        searchDebouncer = setTimeout(async () => {
          const {query, results} = await searchTemplates(searchValue)
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
    window.addEventListener('keydown', handleSearchFieldShortcuts, globalListenerOptions)

    element.addEventListener('click', (e) => {
      const target = e.target

      // open and close modals
      const btnModalAttribute = 'data-b-modal'
      const modalBtn = target.closest(`[${btnModalAttribute}]`)
      if (modalBtn) {
        const modal = modalBtn.getAttribute(btnModalAttribute)
        if (element.getAttribute(modalAttribute) !== modal) {
          element.setAttribute(modalAttribute, modal)
        } else {
          element.removeAttribute(modalAttribute)

          // focus the search field when closing the modals,
          // and returning to the list view.
          if (searchField) {
            searchField.focus({ preventScroll: true })
          }
        }

        return
      }

      // login button
      if (target.closest('.dialog-login-btn')) {
        e.preventDefault()
        openPopup()
      }
    })


    // expose show on element
    // element.show = show
  })

  onCleanup(() => {
    storeOff('login', setAuthState)
    storeOff('logout', setAuthState)

    storeOff('templates-updated', templatesUpdated)
    storeOff('tags-updated', tagsUpdated)
    storeOff('extension-data-updated', extensionDataUpdated)

    globalAbortController.abort()

    globalAbortController = new AbortController()
    globalListenerOptions = {
      capture: true,
      signal: globalAbortController.signal,
    }
  })

  function callbackSelectItem (tplId) {
    // get template from cache
    const template = templates().find((t) => t.id === tplId)

    element.dispatchEvent(new CustomEvent('b-dialog-insert', {
      bubbles: true,
      composed: true,
      detail: template,
    }))
  }

  return (<>
      <style>{styles}</style>
      <div
        ref={element}
        classList={{
          'dialog-container': true,
          'dialog-safari': REGISTER_DISABLED,
        }}
        tabindex="-1"
        >

        <div class="dialog-search">
          <input ref={searchField} type="search" value="" placeholder="Search templates..." spellcheck="false" />
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
                <a href="" class="dialog-login-btn">Sign in</a> to Briskine to access your templates.
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
                callbackSelectItem={callbackSelectItem}                
                />
            )}
            >
            <DialogList
              ref={elementDialogList}
              loggedIn={loggedIn()}
              list={searchResults()}
              showTags={extensionData().dialogTags}
              tags={tags()}
              callbackSelectItem={callbackSelectItem}
              />
          </Show>
        </div>

        <Show when={loggedIn()}>
          <DialogFooter shortcut={props.keyboardShortcut} />
          <DialogSettings extensionData={extensionData()} />
          <DialogActions />
        </Show>
      </div>
    </>)
}