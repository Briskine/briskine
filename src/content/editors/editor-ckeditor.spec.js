/* globals describe, it, before, after, afterEach */
import {expect} from 'chai'

import {insertCkEditorTemplate} from './editor-ckeditor.js'
import {setup, destroy} from '../page/page-parent.js'

let $script
let $container
let $editor

function cleanEditor () {
  $editor.ckeditorInstance.setData('')
}

let translations

function cleanGlobals () {
  // HACK to be able to use mocha.checkLeaks() for the other tests
  translations = window.CKEDITOR_TRANSLATIONS
  delete window.CKEDITOR_TRANSLATIONS
  delete window.CKEDITOR_VERSION
  delete window['data-ck-expando']
}

function setGlobals () {
  window.CKEDITOR_TRANSLATIONS = translations
}

describe('editor CKEditor', function () {
  before(function (done) {
    setup()

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

    window.addEventListener('ckeditor-ready', () => {
      $editor = document.querySelector('[contenteditable]')
      cleanGlobals()
      done()
    }, {once: true})
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

    cleanGlobals()
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

    cleanGlobals()
    expect($editor.innerHTML).to.include('<p><strong>Image</strong>&nbsp;<span class="image-inline ck-widget" contenteditable="false"><img src="#"></span>⁠⁠⁠⁠⁠⁠⁠</p>')
  })

  after(() => {
    $script.remove()
    $editor.ckeditorInstance.destroy()
    $container.remove()

    cleanGlobals()
    destroy()
  })
})
