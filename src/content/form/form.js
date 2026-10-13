/*
 * Template forms, in the frame of the editor.
 *
 * Renders the template with its form fields, and shows it in the top frame,
 * even when the editor is in an iframe.
 */

import { eventFormShow, eventFormRender, eventFormClose } from '../../config.js'
import { on, off, createRequest } from '../../store/store-content.js'
import { renderTemplate } from '../utils/parse-template.js'
import { cursorMarker } from '../cursors/cursors.js'
import debug from '../../debug.js'

const relay = createRequest('formRelay')
const topFrameId = 0

const forms = new Map()

async function renderForm (form) {
  const html = await renderTemplate(form.template, form.session, 'form')
  return html.replaceAll(cursorMarker, '')
}

// resolves true to insert the template, false when the form was canceled
export default async function fillForm ({template = '', session, title = ''}) {
  const id = crypto.randomUUID()
  const form = {template, session}
  const html = await renderForm(form)

  return new Promise((resolve) => {
    form.resolve = resolve
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
      if (!shown) {
        closeForm({id})
      }
    })
    .catch((err) => {
      debug(['fillForm', err], 'error')
      closeForm({id})
    })
  })
}

async function respondToRender ({id, values = {}} = {}) {
  const form = forms.get(id)
  if (!form) {
    return null
  }

  Object.assign(form.session.values, values)

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
  Object.assign(form.session.values, values)
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
