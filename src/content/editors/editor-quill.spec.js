import { expect, describe, it, beforeAll, afterAll } from 'vitest'

import {insertQuillTemplate} from './editor-quill.js'
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
// only tests quill v2
describe('editor Quill', () => {
  beforeAll(async function () {
    await setup()

    $link = document.createElement('link')
    $link.rel = 'stylesheet'
    $link.href = 'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css'
    document.head.appendChild($link)

    $script = document.createElement('script')
    $script.type = 'module'
    $script.textContent = `
      import Quill from 'https://cdn.jsdelivr.net/npm/quill@2/+esm'

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

  it('should insert template', function (done) {
    const template = '<div>Kind regards,</div><div>.</div>'

    $editor.focus()
    insertQuillTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    // give it a second to parse the template
    setTimeout(() => {
      expect($editor.innerHTML).to.include('<p>Kind regards,</p><p>.</p>')

      cleanEditor()
      done()
    })
  })

  afterAll(() => {
    $link.remove()
    $script.remove()
    document.querySelector(`#${containerId}`).remove()
    destroy()
  })
})
