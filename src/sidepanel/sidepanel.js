import {render} from 'solid-js/web'
import {onMount} from 'solid-js'
import browser from 'webextension-polyfill'

import DialogContent from '../content/dialog/dialog-content.js'
import {setup as setupStore} from '../store/store-content.js'
import {eventInsertTemplate} from '../config.js'
import trigger from '../background/background-trigger.js'

import './sidepanel.css'

let keyboardShortcut = ''

function Sidepanel () {
  let element = null

  onMount(() => {
    setupStore()

    element.addEventListener('b-dialog-insert', async (e) => {
      e.stopImmediatePropagation()

      const template = e.detail
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab) {
        return
      }

      trigger(eventInsertTemplate, {template: template}, tab)
    })
  })

  return (
    <div class="briskine-dialog" ref={element}>
      <DialogContent
        keyboardShortcut={keyboardShortcut}
        visible={true}
      />
    </div>
  )
}

render(() => (<Sidepanel />), document.getElementById('sidepanel'))
