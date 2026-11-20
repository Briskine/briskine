/* Editors with beforeinput event support.
 *
 * Slate
 * https://www.slatejs.org/
 *
 * Lexical editor from Facebook
 * https://lexical.dev/
 * Used on WhatsApp Web, Facebook Messenger
 */

import { getActiveElement } from '../utils/active-element.js'
import createDataTransferEvent from '../utils/data-transfer-event.js'
import debug from '../../debug.js'

function isBeforeInputEditor (element) {
  return (
    element?.hasAttribute?.('data-lexical-editor')
    || element?.hasAttribute?.('data-slate-editor')
  )
}

export async function insertBeforeInputTemplate ({ html, text }) {
  const element = getActiveElement()
  if (!isBeforeInputEditor(element)) {
    return false
  }

  let e
  const eventProps = {
    bubbles: true,
    inputType: 'insertReplacementText',
  }

  let resolve, reject
  const promise = new Promise((res, rej) => [resolve, reject] = [res, rej])

  const observer = new MutationObserver(() => {
    observer.disconnect()
    clearTimeout(timeout)
    resolve()
  })

  // timeout for inserting the template
  const timeout = setTimeout(() => {
    observer.disconnect()
    reject(new Error('beforeinput editor did not insert the template'))
  }, 1000)

  observer.observe(element, {
    childList: true,
    characterData: true,
    subtree: true,
  })

  try {
    e = createDataTransferEvent({
      constructor: 'InputEvent',
      type: 'beforeinput',
      dataKey: 'dataTransfer',
      props: eventProps,
      text,
      html,
    })
    element.dispatchEvent(e)
  } catch (err) {
    debug(['insertBeforeInputTemplate', err], 'warn')

    // Safari does not support DataTransfer on our synthetic beforeinput event
    e = new InputEvent('beforeinput', {
      ...eventProps,
      data: text,
    })
    element.dispatchEvent(e)
  }

  await promise

  return true
}
