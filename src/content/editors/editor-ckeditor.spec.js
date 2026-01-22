import { expect, describe, it, beforeAll, afterEach } from 'vitest'

import {insertCkEditorTemplate} from './editor-ckeditor.js'
import {setup} from '../page/page-parent.js'

let $script
let $container
let $editor

function cleanEditor () {
  $editor.ckeditorInstance.setData('')
}

let translations

function setGlobals () {
  window.CKEDITOR_TRANSLATIONS = translations
}

function waitForEditor (p) {
  return new Promise((resolve, reject) => {

    window.addEventListener('ckeditor-ready', () => {
      $editor = document.querySelector('[contenteditable]')
      resolve()
    }, {once: true})    

  })
}

describe('editor CKEditor', function () {
  beforeAll(async () => {
    await setup(chrome || browser)

    $script = document.createElement('script')
    $script.type = 'module'
    $script.textContent = `
      import ClassicEditor from 'https://cdn.jsdelivr.net/npm/@ckeditor/ckeditor5-build-classic/+esm'

      await ClassicEditor.create(document.querySelector('#ckeditor'), {
        licenseKey: 'GPL',
      })
      window.dispatchEvent(new Event('ckeditor-ready'))
    `
    document.body.appendChild($script)

    $container = document.createElement('div')
    $container.id = 'ckeditor'
    document.body.appendChild($container)

    await waitForEditor();
    $editor = document.querySelector('[contenteditable]')
  })

  afterEach(() => {
    cleanEditor()
  })

  it('should insert plain text', async () => {
    setGlobals()

    $editor.focus()
    const template = 'Kind regards'
    await insertCkEditorTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<p>Kind regards</p>')
  })

  it('should insert rich text', async () => {
    setGlobals()

    $editor.focus()
    const template = '<div><strong>Image</strong> <img src="#"></div>'
    await insertCkEditorTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<p><strong>Image</strong>&nbsp;<span class="image-inline ck-widget" contenteditable="false"><img src="#"></span>⁠⁠⁠⁠⁠⁠⁠</p>')
  })
})
