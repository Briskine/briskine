import {createSignal, createResource, Show} from 'solid-js'

import { functionsUrl } from '../config.js'
import {signin} from '../store/store-content.js'

export default function PopupLoginForm ()  {
  const [credentials, setCredentials] = createSignal()
  const [signinRequest] = createResource(credentials, (data) => {
    return signin({
        email: data.email,
        password: data.password,
      })
  })

  function submit (e) {
    e.preventDefault()

    const email = e.target.querySelector('#login-email').value.trim()
    const password = e.target.querySelector('#login-password').value.trim()

    setCredentials({
      email: email,
      password: password,
    })
  }

  return (
    <form
      class="popup-login-form js-login-form"
      onSubmit={submit}
      >
      <Show when={signinRequest.error}>
        <div class="alert alert-danger" role="alert">
         {signinRequest.error.message}
        </div>
      </Show>

      <div class="popup-field">
        <label for="login-email" class="form-label">
          Email
        </label>
        <input
          type="email"
          class="form-control"
          id="login-email"
          autocomplete="username"
          required
        />
      </div>

      <div class="popup-field">
        <div class="popup-field-label">
          <label for="login-password" class="form-label">
            Password
          </label>
          <a
            href={`${functionsUrl}/forgot-password/`}
            target="_blank"
            class="btn-forgot"
            tabindex="-1"
            >
            Forgot password?
          </a>
        </div>
        <input
          type="password"
          class="form-control"
          id="login-password"
          autocomplete="password"
          required
          />
      </div>

      <button
        type="submit"
        class="btn btn-primary btn-wide"
        classList={{
          'btn-loading' : signinRequest.loading,
        }}
        >
        Sign in
      </button>
    </form>
  )
}
