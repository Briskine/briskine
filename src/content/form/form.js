/*
 * Template forms, in the frame of the editor.
 *
 * Renders the template with its form fields, and shows it in the top frame,
 * even when the editor is in an iframe.
 */

import { eventFormShow, eventFormRender, eventFormClose, frameRelayRequest } from '../../config.js'
import { on, off, createRequest } from '../../store/store-content.js'
import { renderTemplate } from '../utils/parse-template.js'
import { cursorMarker } from '../cursors/cursors.js'
import debug from '../../debug.js'

const relay = createRequest(frameRelayRequest)
const topFrameId = 0

const forms = new Map()

// fields where an edit can change a loop item's text a little at a time
const textTypes = ['text', 'email', 'url', 'tel', 'textarea']

// the form dialog sends every value changed since it opened,
// so a change is a value that's different from what it sent last time.
function changedKeys (received = {}, values = {}) {
  return Object.keys(values).filter((key) => {
    return !Object.hasOwn(received, key) || JSON.stringify(values[key]) !== JSON.stringify(received[key])
  })
}

// applies only what changed in the form dialog. A value it sent before can be
// out of date, after it was carried over to an edited loop item here.
// Also notes whether only text fields changed, so loop items whose text was
// edited keep their values.
function applyValues (form, values = {}) {
  const session = form.session
  const changed = changedKeys(form.received, values)
  form.received = values
  session.textEdit = changed.length > 0 && changed.every((key) => {
    return textTypes.includes(session.fields.get(key)?.type)
  })
  changed.forEach((key) => session.values[key] = values[key])
}

async function renderForm (form) {
  const html = await renderTemplate(form.template, form.session, 'form')
  return html.replaceAll(cursorMarker, '')
}

// resolves true to insert the template, false when the form was canceled.
// rejects when the top frame can't show the form.
export default async function fillForm ({template = '', session, title = ''}) {
  const id = crypto.randomUUID()
  const form = {template, session, received: {}}
  const html = await renderForm(form)

  return new Promise((resolve, reject) => {
    form.resolve = resolve
    form.reject = reject
    forms.set(id, form)

    relay({
      event: eventFormShow,
      details: {
        id,
        title,
        html,
      },
      frameId: topFrameId,
    })
    .then((shown) => {
      // another form is open
      if (shown === false) {
        closeForm({id})
        return
      }

      if (shown !== true) {
        failForm(id)
      }
    })
    .catch((err) => {
      debug(['fillForm', err], 'error')
      failForm(id)
    })
  })
}

function failForm (id) {
  const form = forms.get(id)
  if (!form) {
    return
  }

  forms.delete(id)
  form.reject(new Error('This template has a form, which can\'t be shown on this page.'))
}

async function respondToRender ({id, values = {}} = {}) {
  const form = forms.get(id)
  if (!form) {
    return null
  }

  applyValues(form, values)

  try {
    return {html: await renderForm(form)}
  } catch (err) {
    return {error: err.message || String(err)}
  }
}

function closeForm ({id, values = {}, insert = false} = {}) {
  const form = forms.get(id)
  if (!form) {
    return
  }

  forms.delete(id)
  applyValues(form, values)
  form.resolve(insert)
}

export function setup () {
  on(eventFormRender, respondToRender)
  on(eventFormClose, closeForm)
}

export function destroy () {
  off(eventFormRender, respondToRender)
  off(eventFormClose, closeForm)

  for (const id of forms.keys()) {
    closeForm({id})
  }
}
