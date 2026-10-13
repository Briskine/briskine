/*
 * Relay form messages between frames of the same tab.
 *
 * The form is shown in the top frame, but rendered in the frame of the editor.
 * Adds the sender's frameId, so the other frame can answer.
 */

import browser from 'webextension-polyfill'

import { eventFormShow, eventFormRender, eventFormClose } from '../config.js'
import trigger from './background-trigger.js'

const relayRequest = 'formRelay'
const formEvents = [eventFormShow, eventFormRender, eventFormClose]

browser.runtime.onMessage.addListener((req, sender, sendResponse) => {
  const {event, details, frameId} = req?.data || {}
  if (
    req?.type !== relayRequest
    || sender.id !== browser.runtime.id
    || !sender.tab
    || !formEvents.includes(event)
  ) {
    return false
  }

  trigger(event, {...details, frameId: sender.frameId}, sender.tab, frameId)
    .then((response) => sendResponse(response?.[0] ?? null))

  return true
})
