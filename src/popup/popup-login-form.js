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
      class="popup-login-form text-start js-login-form"
      onSubmit={submit}
      >
      <Show when={signinRequest.error}>
        <div class="alert alert-danger" role="alert">
         {signinRequest.error.message}
        </div>
      </Show>

      <div class="mb-3">
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

      <div class="mb-3">
        <a
          href={functionsUrl}
          target="_blank"
          class="btn btn-link float-end btn-forgot"
          tabindex="-1"
          >
          Forgot password?
        </a>

        <label for="login-password" class="form-label">
            Password
        </label>
        <input
          type="password"
          class="form-control"
          id="login-password"
          autocomplete="password"
          required
          />
      </div>

      <div class="text-center">
        <button
          type="submit"
          class="btn btn-lg btn-primary"
          classList={{
            'btn-loading' : signinRequest.loading,
          }}
          >
          Sign In
        </button>
      </div>
    </form>
  )
}
