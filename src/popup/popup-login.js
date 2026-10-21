import {createSignal, createResource, Show} from 'solid-js'

import { websiteUrl, functionsUrl }  from '../config.js'
import {getSession as storeGetSession} from  '../store/store-content.js'
import PopupLoginForm from './popup-login-form.js'

export default function PopupLogin () {
  const [getSession, setGetSession] = createSignal(false)
  const [showLoginForm] = createResource(getSession, () => {
    // check session
    return storeGetSession()
      .then(() => {
        return false
      })
      .catch(() => {
        // logged-out
        // show login form
        return true
      })
  })

  return (
    <div class="popup-login">
      <div class="popup-logo">
        <a href={websiteUrl} target="_blank">
          <img src="../icons/briskine-combo.svg" width="120" alt="Briskine"/>
        </a>
      </div>

      <div class="popup-login-body">
        <Show when={!showLoginForm()} fallback={(<PopupLoginForm />)}>
          <p class="popup-login-lead">
            Sign in to access your templates.
          </p>

          <button
            type="button"
            class="btn btn-primary btn-wide"
            classList={{
              'btn-loading': showLoginForm.loading
            }}
            onClick={() => setGetSession(true)}>
            Sign in
          </button>
        </Show>
      </div>

      <div class="popup-login-footer popup-label-register">
        Don't have an account yet?
        <br />
        <a href={`${functionsUrl}/signup/`} target="_blank">
          Create a free account
        </a>
      </div>
    </div>
  )
}
