import {render} from 'solid-js/web'
import {onMount} from 'solid-js'
import browser from 'webextension-polyfill'

import DialogContent from '../content/dialog/dialog-content.js'
import {setup as setupStore} from '../store/store-content.js'
import {eventInsertTemplate} from '../config.js'
import trigger from '../background/background-trigger.js'

import './sidepanel.css'

let keyboardShortcut = ''

async function insertTemplate (template) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (!tab) {
    return
  }

  trigger(eventInsertTemplate, {template: template}, tab)
}

function Sidepanel () {
  onMount(() => {
    setupStore()
  })

  return (
    <div class="briskine-dialog">
      <DialogContent
        keyboardShortcut={keyboardShortcut}
        visible={true}
        onInsert={insertTemplate}
      />
    </div>
  )
}

render(() => (<Sidepanel />), document.getElementById('sidepanel'))
