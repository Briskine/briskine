/* global REGISTER_DISABLED */
import {customElement, noShadowDOM} from 'solid-element'
import {createSignal, onMount, Show} from 'solid-js'

import './popup.css'

import './popup-login.js'
import './popup-dashboard.js'
import store from '../store/store-content.js'
import setTheme from './popup-theme.js'

customElement('popup-container', {}, () => {
  noShadowDOM()

  const [loggedIn, setLoggedIn] = createSignal(null)

  function checkLogin() {
    return store.getAccount()
    .then(() => {
      setLoggedIn(true)
      return
    })
    .catch(() => {
      setLoggedIn(false)
      return
    })
  }

  onMount(() => {
    setTheme()
    store.setup()
    checkLogin()

    store.on('login', () => {
      // close window when the popup is opened as a new tab, not browser action.
      // eg. opened from the dialog
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('source') === 'tab') {
          return window.close()
      }

      return checkLogin()
    })

    store.on('logout', () => {
      checkLogin()
    })
  })


  return (
    <div
      class={`popup-container ${REGISTER_DISABLED ? 'popup-register-disabled' : ''}`}
      >
        <Show when={loggedIn() === true}>
          <popup-dashboard />
        </Show>
        <Show when={loggedIn() === false}>
          <popup-login />
        </Show>
    </div>
  )
})
