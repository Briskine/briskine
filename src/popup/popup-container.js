/* global REGISTER_DISABLED */
import {createSignal, onMount, Show} from 'solid-js'

import './popup.css'

import PopupLogin from './popup-login.js'
import PopupDashboard from './popup-dashboard.js'
import {
  getAccount,
  setup as storeSetup,
  on as storeOn,
} from '../store/store-content.js'
import setTheme from './popup-theme.js'

export default function PopupContainer () {
  const [loggedIn, setLoggedIn] = createSignal(null)

  function checkLogin() {
    return getAccount()
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
    storeSetup()
    checkLogin()

    storeOn('login', () => {
      // close window when the popup is opened as a new tab, not browser action.
      // eg. opened from the dialog
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('source') === 'tab') {
          return window.close()
      }

      return checkLogin()
    })

    storeOn('logout', () => {
      checkLogin()
    })
  })


  return (
    <div
      class={`popup-container ${REGISTER_DISABLED ? 'popup-register-disabled' : ''}`}
      >
        <Show when={loggedIn() === true}>
          <PopupDashboard />
        </Show>
        <Show when={loggedIn() === false}>
          <PopupLogin />
        </Show>
    </div>
  )
}
