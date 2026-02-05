import { expect, describe, it, beforeAll, beforeEach, afterAll } from 'vitest'

import {pageInsertQuill1Template} from './editor-quill1.js'

let $link
let $script
let $importmap
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
describe('editor Quill1', () => {
  beforeAll(async function () {
    $link = document.createElement('link')
    $link.rel = 'stylesheet'
    $link.href = 'https://ga.jspm.io/npm:quill@1.3.7/dist/quill.snow.css'
    document.head.appendChild($link)

    $importmap = document.createElement('script')
    $importmap.type = 'importmap'
    $importmap.textContent = `
      {
        "imports": {
          "quill": "https://ga.jspm.io/npm:quill@1.3.7/dist/quill.js"
        },
        "scopes": {
          "https://ga.jspm.io/": {
            "buffer": "https://ga.jspm.io/npm:@jspm/core@2.1.0/nodelibs/browser/buffer.js"
          }
        }
      }
    `
    document.body.appendChild($importmap)

    $script = document.createElement('script')
    $script.type = 'module'
    $script.textContent = `
      import Quill from 'quill'

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
    $editor.focus()
  })

  it('should insert template', async () => {
    const template = '<div>Kind regards,</div><div>.</div>'
    await pageInsertQuill1Template({
      html: template,
    })

    expect($editor.innerHTML).to.include('<p>Kind regards,</p><p>.</p>')
  })

  afterAll(() => {
    $link.remove()
    $script.remove()
    $importmap.remove()
    document.querySelector(`#${containerId}`).remove()
  })
})
