import {createSignal, createResource, Show} from 'solid-js'

import config from '../config.js'
import store from '../store/store-content.js'
import PopupLoginForm from './popup-login-form.js'

export default function PopupLogin () {
  const [getSession, setGetSession] = createSignal(false)
  const [showLoginForm] = createResource(getSession, () => {
    // check session
    return store.getSession()
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
    <div class="popup-login text-center">
      <div class="popup-box popup-logo">
        <a href={config.websiteUrl} target="_blank">
          <img src="../icons/briskine-combo.svg" width="160" alt="Briskine"/>
        </a>
      </div>

      <div class="popup-box">
        <Show when={!showLoginForm()} fallback={(<PopupLoginForm />)}>
          <p>
            <strong>
              Sign in to access your templates.
            </strong>
          </p>

          <button
            type="button"
            class="btn btn-lg btn-primary"
            classList={{
              'btn-loading': showLoginForm.loading
            }}
            onClick={() => setGetSession(true)}>
            Sign In
          </button>
        </Show>
      </div>

      <div class="popup-box text-muted popup-label-register">
        <small>
          Don't have an account yet?
          <br />
          <a href={`${config.functionsUrl}/signup/`} target="_blank">
            Create a free account
          </a>
        </small>
      </div>
    </div>
  )
}
