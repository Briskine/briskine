import {render} from 'solid-js/web'
import {onMount} from 'solid-js'
import browser from 'webextension-polyfill'

import DialogUI from '../content/dialog/dialog-ui.js'
import {eventInsertTemplate} from '../config.js'

let keyboardShortcut = {};

function App () {
  let element;

  onMount(() => {

    element.addEventListener('b-dialog-insert', async (e) => {
      e.stopImmediatePropagation()

      const template =  e.detail

      // BUG WORKAROUND
      // Safari will throw an error about the template being non JSON-serializable if it contains dates.
      const cleanTemplate = {
        ...template,
        created_datetime: null,
        modified_datetime: null,
      }

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      try {
        const response = await browser.tabs.sendMessage(
          tab.id, 
          {
            type: 'trigger',
            data: {
              name: eventInsertTemplate,
              details: {template: cleanTemplate},
            },
          }
        )
      } catch (err) {
        const errorType = isNotAvailableError(err) ? 'warn' : 'error'
        debug(['trigger', params, tab, err], errorType)
      }

    })
  })
  
  return (<div id="app-body" ref={element}>
    <DialogUI 
      keyboardShortcut={keyboardShortcut} 
      visible={true} 
    />
  </div>)
  
}


render(() => (<App />), document.getElementById('app'))