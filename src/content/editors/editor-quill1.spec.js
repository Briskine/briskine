import { expect, describe, it, beforeAll, beforeEach, afterAll } from 'vitest'

import {insertQuill1Template} from './editor-quill1.js'
import {setup, destroy} from '../page/page-parent.js'

let $link
let $script
let $editor
let containerId = 'quill-container'

function cleanEditor () {
  $editor.innerHTML = ''
  Array('input', 'change').forEach((eventType) => {
    $editor.dispatchEvent(new Event(eventType, {bubbles: true}))
  })
}

function waitForEditor () {
  return new Promise((resolve) => {
    window.addEventListener('quill-ready', () => {
      $editor = document.querySelector('[contenteditable]')
      resolve()
    }, {once: true})
  })
}
// only tests quill v1
describe('editor Quill', () => {
  beforeAll(async function () {
    await setup()

    $link = document.createElement('link')
    $link.rel = 'stylesheet'
    $link.href = 'https://esm.sh/quill@1/dist/quill.snow.css'
    document.head.appendChild($link)

    $script = document.createElement('script')
    $script.type = 'module'
    $script.textContent = `
      import Quill from 'https://esm.sh/quill@1/'

      const $editor = document.createElement('div')
      $editor.id = '${containerId}'
      document.body.appendChild($editor)

      const quill = new Quill('#${containerId}', {
        theme: 'snow'
      })

      window.dispatchEvent(new Event('quill-ready'))
    `
    document.body.appendChild($script)

    await waitForEditor()
  }, 20000)

  beforeEach(() => {
    cleanEditor()
  })

  it('should insert template', async () => {
    const template = '<div>Kind regards,</div><div>.</div>'

    $editor.focus()
    await insertQuill1Template({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<p>Kind regards,</p><p>.</p>')
  })

  afterAll(() => {
    $link.remove()
    $script.remove()
    document.querySelector(`#${containerId}`).remove()
    destroy()
  })
})
