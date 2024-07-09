/* globals describe, it, before, after */
import {expect} from 'chai';

import {insertProseMirrorTemplate} from './editor-prosemirror.js';

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

describe.only('editor ProseMirror', () => {
  before(function (done) {
    this.timeout(20000)

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

    window.addEventListener('prosemirror-ready', () => {
      $editor = document.querySelector('[contenteditable]')
      done()
    }, {once: true})

    document.body.appendChild($script)
  })

  it('should insert template containing only anchor', function (done) {
    const template = '<a href="https://www.briskine.com">briskine-two</a>'

    $editor.focus()
    insertProseMirrorTemplate({
      element: $editor,
      text: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      quicktext: {},
    })

    // give it a second to parse the template
    setTimeout(() => {
      expect($editor.innerHTML).to.include('<a href="https://www.briskine.com">briskine-two</a>')

      cleanEditor()
      done()
    })
  })

  it('should insert template containing anchor with div container', function (done) {
    const template = '<div><a href="https://www.briskine.com">briskine-one</a></div>'

    $editor.focus()
    insertProseMirrorTemplate({
      element: $editor,
      text: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      quicktext: {},
    })

    // give it a second to parse the template
    setTimeout(() => {
      expect($editor.innerHTML).to.include('<a href="https://www.briskine.com">briskine-one</a>')

      cleanEditor()
      done()
    })
  })

  it('should insert template containing anchor with multiple containers', function (done) {
    const template = '<div><div><p><a href="https://www.briskine.com">briskine-one</a></p></div></div>'

    $editor.focus()
    insertProseMirrorTemplate({
      element: $editor,
      text: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      quicktext: {},
    })

    // give it a second to parse the template
    setTimeout(() => {
      expect($editor.innerHTML).to.include('<a href="https://www.briskine.com">briskine-one</a>')

      cleanEditor()
      done()
    })
  })

  it('should insert template containing heading', function (done) {
    const template = '<h1>heading 1</h1>'

    $editor.focus()
    insertProseMirrorTemplate({
      element: $editor,
      text: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      quicktext: {},
    })

    // give it a second to parse the template
    setTimeout(() => {
      expect($editor.innerHTML).to.include('<h1>heading 1</h1>')

      cleanEditor()
      done()
    })
  })

  it('should insert template containing list', function (done) {
    const template = '<ul><li>item</li><li>item</li></ul>'

    $editor.focus()
    insertProseMirrorTemplate({
      element: $editor,
      text: template,
      word: {
        start: 0,
        end: 0,
        text: '',
      },
      quicktext: {},
    })

    // give it a second to parse the template
    setTimeout(() => {
      expect($editor.innerHTML).to.include('<ul><li><p>item</p></li><li><p>item</p></li></ul>')

      cleanEditor()
      done()
    })
  })

  after(() => {
    $link.remove()
    $script.remove()
    document.querySelector(`#${containerId}`).remove()
  })
})
