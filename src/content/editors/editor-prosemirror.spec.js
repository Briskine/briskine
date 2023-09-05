/* globals describe, it */
import {expect} from 'chai';

import {parseProseMirrorContent, insertProseMirrorTemplate} from './editor-prosemirror.js';

describe('editor ProseMirror', () => {
  it('should add brs after block nodes', () => {
    expect(parseProseMirrorContent('<div>one</div><div>two</div>')).to.equal('<div>one</div><br><div>two</div>')
  })

  it('should add brs only if the block node has a next sibling', () => {
    expect(parseProseMirrorContent('<div>one<div>two</div></div>')).to.equal('<div>one<div>two</div></div>')
  })

  it('should trim collapsed whitespace', () => {
    expect(parseProseMirrorContent('<div>    one    </div>')).to.equal('<div>one</div>')
  })

  it('should keep inline whitespace', () => {
    expect(parseProseMirrorContent('<div>one <strong>two</strong> three</div>')).to.equal('<div>one <strong>two</strong> three</div>')
  })

  it('should keep whitespace inside inline nodes', () => {
    expect(parseProseMirrorContent('<div>one<strong> two </strong>three</div>')).to.equal('<div>one<strong> two </strong>three</div>')
  })

  it('should collapse consecutive whitespace to a single whitespace', () => {
    expect(parseProseMirrorContent('<div>one    <strong>two</strong</div>')).to.equal('<div>one <strong>two</strong></div>')
  })

  it('should remove whitespace-only blocks and newlines', () => {
    expect(parseProseMirrorContent(`
      <div>one</div>
      <div>two</div>
    `)).to.equal('<div>one</div><br><div>two</div>')
  })

  it.only('should insert template containing only anchor', function (done) {
    this.timeout(20000)

    const $link = document.createElement('link')
    $link.rel = 'stylesheet'
    $link.href = 'https://prosemirror.net/css/editor.css'
    document.head.appendChild($link)

    const $script = document.createElement('script')
    $script.type = 'module'
    $script.textContent = `
      import {EditorState} from 'https://cdn.jsdelivr.net/npm/prosemirror-state@1/+esm'
      import {EditorView} from 'https://cdn.jsdelivr.net/npm/prosemirror-view@1/+esm'
      import {Schema, DOMParser} from 'https://cdn.jsdelivr.net/npm/prosemirror-model@1/+esm'
      import {schema} from 'https://cdn.jsdelivr.net/npm/prosemirror-schema-basic@1/+esm'
      import {addListNodes} from 'https://cdn.jsdelivr.net/npm/prosemirror-schema-list@1/+esm'
      import {exampleSetup} from 'https://cdn.jsdelivr.net/npm/prosemirror-example-setup@1/+esm'

      const $editor = document.createElement('div')
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
      const template = '<div><a href="https://www.briskine.com">briskine.com</a></div>'
      const $editor = document.querySelector('[contenteditable]')

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
        // console.log($editor.innerHTML)
        // expect($editor.innerHTML).to.equal('<p><a href="https://www.briskine.com">briskine.com</a></p>')
        expect($editor.innerHTML).to.equal('<p>briskine.com</p>')
        done()
      })
    }, {once: true})

    document.body.appendChild($script)
  })
})

