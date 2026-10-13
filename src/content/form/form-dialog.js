/*
 * Template form dialog, in the top frame.
 *
 * Shows the template with its form fields,
 * and asks the frame of the editor to render it again when a field changes.
 */

import {createSignal, onMount, onCleanup} from 'solid-js'
import {render} from 'solid-js/web'
import { Idiomorph } from 'idiomorph'

import { eventFormShow, eventFormRender, eventFormClose, formTagPrefix } from '../../config.js'
import { on, off, createRequest } from '../../store/store-content.js'
import sanitize from '../utils/sanitize.js'
import { scopeTagName } from '../utils/extension-element.js'
import debug from '../../debug.js'

import styles from './form-dialog.css?inline'

const relay = createRequest('formRelay')
const formTagName = scopeTagName(formTagPrefix)

// the template can't add its own form, submit ours, or style the dialog
const sanitizeOptions = {
  FORBID_TAGS: ['form', 'dialog', 'button', 'style'],
}

let formInstance = null
let showForm = () => false

function readValue (field) {
  if (field.type === 'checkbox') {
    return field.checked
  }

  if (field.type === 'number') {
    return field.value === '' ? '' : field.valueAsNumber
  }

  if (field.multiple) {
    return Array.from(field.selectedOptions).map((option) => option.value)
  }

  return field.value
}

function FormDialog () {
  let dialog = null
  let form = null
  let content = null

  const [title, setTitle] = createSignal('')
  const [error, setError] = createSignal('')

  // the open form: its id, the frame that renders it, and the changed values
  let current = null
  let renderCount = 0

  function update (html) {
    Idiomorph.morph(content, sanitize(html, sanitizeOptions), {
      morphStyle: 'innerHTML',
      callbacks: {
        // keep what's being typed in the focused field
        beforeAttributeUpdated: (attribute, element) => {
          return !(attribute === 'value' && element === content.getRootNode().activeElement)
        },
      },
    })
  }

  function show ({id, frameId, title = '', html = ''} = {}) {
    if (current) {
      return false
    }

    current = {
      id,
      frameId,
      values: {},
    }
    setTitle(title)
    setError('')
    update(html)

    dialog.showModal()
    content.querySelector('[data-form-id]')?.focus()

    return true
  }

  async function change (e) {
    const fieldId = e.target?.dataset?.formId
    if (!current || !fieldId) {
      return
    }

    current.values[fieldId] = readValue(e.target)

    const {id, frameId, values} = current
    const count = ++renderCount
    const response = await relay({
      event: eventFormRender,
      details: {
        id,
        values,
      },
      frameId,
    }).catch((err) => {
      debug(['form render', err], 'error')
    })

    // a newer render started, or the form was closed
    if (count !== renderCount || current?.id !== id) {
      return
    }

    if (response?.error) {
      setError(response.error)
      return
    }

    setError('')
    if (typeof response?.html === 'string') {
      update(response.html)
    }
  }

  function close (insert = false) {
    if (!current) {
      return
    }

    const {id, frameId, values} = current
    current = null
    // gives focus back to the page, or the iframe of the editor
    dialog.close()

    relay({
      event: eventFormClose,
      details: {
        id,
        values,
        insert,
      },
      frameId,
    }).catch((err) => {
      debug(['form close', err], 'error')
    })
  }

  function submit (e) {
    e.preventDefault()
    close(true)
  }

  function cancel (e) {
    e.preventDefault()
    // some websites close their own modal on the escape keyup
    window.addEventListener('keyup', (e) => e.stopPropagation(), {capture: true, once: true})
    close(false)
  }

  let abortController
  onMount(() => {
    abortController = new AbortController()
    const listenerOptions = {
      capture: true,
      signal: abortController.signal,
    }

    // keep the page from handling events in the dialog,
    // eg. Gmail keyboard shortcuts while typing in a field.
    const stopEvents = ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'focus', 'focusin']
    stopEvents.forEach((event) => {
      window.addEventListener(event, (e) => {
        if (e.target !== formInstance) {
          return
        }

        e.stopPropagation()

        // stopping propagation also hides it from our own listeners
        if (event === 'keydown' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          form.requestSubmit()
        }
      }, listenerOptions)
    })

    showForm = show
  })

  onCleanup(() => {
    abortController.abort()
    showForm = () => false
  })

  return (
    <dialog ref={dialog} class="briskine-form" on:cancel={cancel}>
      <style>{styles}</style>
      <form ref={form} method="dialog" on:submit={submit} on:input={change}>
        <header class="briskine-form-header">{title()}</header>
        <div ref={content} class="briskine-form-content" />
        <div class="briskine-form-error" hidden={!error()}>{error()}</div>
        <footer class="briskine-form-footer">
          <button type="button" class="briskine-form-cancel" on:click={() => close(false)}>
            Cancel
          </button>
          <button type="submit" class="briskine-form-insert">
            Insert
          </button>
        </footer>
      </form>
    </dialog>
  )
}

customElements.define(formTagName, class extends HTMLElement {
  connectedCallback () {
    if (!this.isConnected) {
      return
    }

    const shadowRoot = this.attachShadow({mode: 'closed'})
    this.disposer = render(() => <FormDialog />, shadowRoot)
  }
  disconnectedCallback () {
    this.disposer?.()
  }
})

function respondToShow (details = {}) {
  if (!formInstance) {
    formInstance = document.createElement(formTagName)
    document.documentElement.appendChild(formInstance)
  }

  return showForm(details)
}

export function setup () {
  // forms from every frame show in the top one
  if (window !== window.top) {
    return
  }

  on(eventFormShow, respondToShow)
}

export function destroy () {
  off(eventFormShow, respondToShow)

  formInstance?.remove()
  formInstance = null
}
