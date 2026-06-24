import {render} from 'solid-js/web'
import {onMount} from 'solid-js'
import browser from 'webextension-polyfill'

import DialogContent from '../content/dialog/dialog-content.js'
import {eventInsertTemplate} from '../config.js'

import debug from '../debug.js'

function isNotAvailableError (err) {
  return err?.message?.includes?.('Receiving end does not exist')
}

let keyboardShortcut = {}

function App () {
  // eslint-disable-next-line no-unassigned-vars
  let element

  onMount(() => {
    element.addEventListener('b-dialog-insert', async (e) => {
      e.stopImmediatePropagation()

      const template =  e.detail
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

      try {
        await browser.tabs.sendMessage(
          tab.id,
          {
            type: 'trigger',
            data: {
              name: eventInsertTemplate,
              details: {template: template},
            },
          }
        )
      } catch (err) {
        const errorType = isNotAvailableError(err) ? 'warn' : 'error'
        debug(['trigger', tab, err], errorType)
      }

    })
  })

  return (
    <div id="app-body" ref={element}>
      <DialogContent
        keyboardShortcut={keyboardShortcut}
        visible={true}
      />
    </div>
  )
}

render(() => (<App />), document.getElementById('app'))
