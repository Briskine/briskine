/*
 * Relay messages between frames of the same tab.
 *
 * The dialog and the form are shown in the top frame,
 * but the editor can be in another frame.
 * Adds the sender's frameId, so the other frame can answer.
 */

import browser from 'webextension-polyfill'

import {
  eventFormShow,
  eventFormRender,
  eventFormClose,
  eventDialogShow,
  eventDialogClose,
  frameRelayRequest,
} from '../config.js'
import trigger from './background-trigger.js'

const relayEvents = [
  eventFormShow,
  eventFormRender,
  eventFormClose,
  eventDialogShow,
  eventDialogClose,
]

browser.runtime.onMessage.addListener((req, sender, sendResponse) => {
  const {event, details, frameId} = req?.data || {}
  if (
    req?.type !== frameRelayRequest
    || sender.id !== browser.runtime.id
    || !sender.tab
    || !relayEvents.includes(event)
  ) {
    return false
  }

  trigger(event, {...details, frameId: sender.frameId}, sender.tab, frameId)
    .then((response) => sendResponse(response?.[0] ?? null))

  return true
})
