import { expect, describe, it, beforeAll, beforeEach, afterAll } from 'vitest'

import {insertQuill1Template} from './editor-quill1.js'

let $link
let $script
let $editor
let containerId = 'quill-container'

function cleanEditor () {
  window._quill.setText('')
  window._quill.focus()
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
    $link.href = '/vendor/quill1.snow.css'
    document.head.appendChild($link)

    $script = document.createElement('script')
    $script.type = 'module'
    $script.textContent = `
      import Quill from '/vendor/quill1.js'

      const $editor = document.createElement('div')
      $editor.id = '${containerId}'
      document.body.appendChild($editor)

      window._quill = new Quill('#${containerId}', {
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
    await insertQuill1Template({
      html: '<div>Kind regards,</div><div>.</div>',
      text: 'Kind regards,\n.',
    })

    expect($editor.innerHTML).to.include('<p>Kind regards,</p><p>.</p>')
  })

  afterAll(() => {
    window._quill = null
    $link.remove()
    $script.remove()
    document.querySelector(`#${containerId}`).remove()
  })
})
