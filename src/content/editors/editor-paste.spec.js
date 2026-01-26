import { expect, describe, it, beforeAll, beforeEach, afterAll } from 'vitest'

import {insertPasteTemplate} from './editor-paste.js'
import {setup, destroy} from '../page/page-parent.js'

let $link
let $script
let $editor
let containerId = 'prosemirror-container'

function cleanEditor () {
  $editor.innerHTML = ''
  Array('input', 'change').forEach((eventType) => {
    $editor.dispatchEvent(new Event(eventType, {bubbles: true}))
  })
}

function waitForEditor () {
  return new Promise((resolve) => {

    window.addEventListener('prosemirror-ready', () => {
      $editor = document.querySelector('[contenteditable]')
      resolve()
    }, {once: true})

  })
}

// paste is used for ProseMirror and Draft.js.
// we're only testing ProseMirror here.
describe('editor Paste', function () {
  beforeAll(async function () {
    await setup()

    $link = document.createElement('link')
    $link.rel = 'stylesheet'
    $link.href = 'https://prosemirror.net/css/editor.css'
    document.head.appendChild($link)

    $script = document.createElement('script')
    $script.type = 'module'
    $script.textContent = `
      import {EditorState} from 'https://cdn.jsdelivr.net/npm/prosemirror-state@1/+esm'
      import {EditorView} from 'https://cdn.jsdelivr.net/npm/prosemirror-view@1/+esm'
      import {Schema, DOMParser} from 'https://cdn.jsdelivr.net/npm/prosemirror-model@1/+esm'
      import {schema} from 'https://cdn.jsdelivr.net/npm/prosemirror-schema-basic@1/+esm'
      import {addListNodes} from 'https://cdn.jsdelivr.net/npm/prosemirror-schema-list@1/+esm'
      import {exampleSetup} from 'https://cdn.jsdelivr.net/npm/prosemirror-example-setup@1/+esm'

      const $editor = document.createElement('div')
      $editor.id = '${containerId}'
      const $content = document.createElement('div')
      document.body.appendChild($editor)

      // Mix the nodes from prosemirror-schema-list into the basic schema to
      // create a schema with list support.
      const mySchema = new Schema({
        nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
        marks: schema.spec.marks
      })

      new EditorView($editor, {
        state: EditorState.create({
          doc: DOMParser.fromSchema(mySchema).parse($content),
          plugins: exampleSetup({schema: mySchema})
        })
      })

      window.dispatchEvent(new Event('prosemirror-ready'))
    `

    document.body.appendChild($script)

    await waitForEditor()
  }, 20000)

  beforeEach(() => {
    cleanEditor()
  })

  it('should insert template containing only anchor', async function () {
    const template = '<a href="https://www.briskine.com">briskine-two</a>'

    $editor.focus()
    await insertPasteTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<a href="https://www.briskine.com">briskine-two</a>')
  })

  it('should insert template containing anchor with div container', async () => {
    const template = '<div><a href="https://www.briskine.com">briskine-one</a></div>'

    $editor.focus()
    await insertPasteTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<a href="https://www.briskine.com">briskine-one</a>')
  })

  it('should insert template containing anchor with multiple containers', async () => {
    const template = '<div><div><p><a href="https://www.briskine.com">briskine-one</a></p></div></div>'

    $editor.focus()
    await insertPasteTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<a href="https://www.briskine.com">briskine-one</a>')
  })

  it('should insert template containing heading', async () => {
    const template = '<h1>heading 1</h1>'

    $editor.focus()
    await insertPasteTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<h1>heading 1</h1>')
  })

  it('should insert template containing list', async () => {
    const template = '<ul><li>item</li></ul>'

    $editor.focus()
    await insertPasteTemplate({
      element: $editor,
      html: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      template: {},
    })

    expect($editor.innerHTML).to.include('<ul><li><p>item</p></li></ul>')
  })

  afterAll(() => {
    $link.remove()
    $script.remove()
    document.querySelector(`#${containerId}`).remove()
    destroy()
  })
})
