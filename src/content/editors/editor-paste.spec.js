import { expect, describe, it } from 'vitest'

import {pageInsertPasteTemplate} from './editor-paste.js'

async function setupProseMirror () {
  let containerId = 'prosemirror-container'

  const $link = document.createElement('link')
  $link.rel = 'stylesheet'
  $link.href = 'https://prosemirror.net/css/editor.css'
  document.head.appendChild($link)

  const $container = document.createElement('div')
  $container.id = containerId
  document.body.appendChild($container)

  const $script = document.createElement('script')
  $script.type = 'module'
  $script.textContent = `
    import {EditorState} from 'https://cdn.jsdelivr.net/npm/prosemirror-state@1/+esm'
    import {EditorView} from 'https://cdn.jsdelivr.net/npm/prosemirror-view@1/+esm'
    import {Schema, DOMParser} from 'https://cdn.jsdelivr.net/npm/prosemirror-model@1/+esm'
    import {schema} from 'https://cdn.jsdelivr.net/npm/prosemirror-schema-basic@1/+esm'
    import {addListNodes} from 'https://cdn.jsdelivr.net/npm/prosemirror-schema-list@1/+esm'
    import {exampleSetup} from 'https://cdn.jsdelivr.net/npm/prosemirror-example-setup@1/+esm'

    const $editor = document.getElementById('${containerId}')
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

  function destroy() {
    $link.remove()
    $script.remove()
    $container.remove()
  }

  const promise = new Promise((resolve) => {
    window.addEventListener('prosemirror-ready', () => {
      const $editor = document.querySelector('[contenteditable]')
      $editor.focus()
      resolve([$editor, destroy])
    }, {once: true})
  })

  document.body.appendChild($script)

  return promise
}

async function setupCkEditor () {
  let containerId = 'ckeditor-container'

  const $container = document.createElement('div')
  $container.id = containerId
  document.body.appendChild($container)

  const $script = document.createElement('script')
  $script.type = 'module'
  $script.textContent = `
    import ClassicEditor from 'https://cdn.jsdelivr.net/npm/@ckeditor/ckeditor5-build-classic/+esm'

    await ClassicEditor.create(document.getElementById('${containerId}'), {
      licenseKey: 'GPL',
    })
    window.dispatchEvent(new Event('ckeditor-ready'))
  `

  function destroy() {
    $script.remove()
    $container.remove()
  }

  const promise = new Promise((resolve) => {
    window.addEventListener('ckeditor-ready', () => {
      const $editor = document.querySelector('[contenteditable]')
      $editor.focus()
      resolve([$editor, destroy])
    }, {once: true})
  })

  document.body.appendChild($script)

  return promise
}

describe('editor Paste', function () {
  it('should insert template containing only anchor in prosemirror', async function () {
    const template = '<a href="https://www.briskine.com">briskine-two</a>'
    const [editor, destroy] = await setupProseMirror()
    await pageInsertPasteTemplate({
      html: template,
    })

    expect(editor.innerHTML).to.equal('<p><a href="https://www.briskine.com">briskine-two</a></p>')
    destroy()
  })

  it('should insert template containing anchor with div container in prosemirror', async () => {
    const template = '<div><a href="https://www.briskine.com">briskine-one</a></div>'
    const [editor, destroy] = await setupProseMirror()

    await pageInsertPasteTemplate({
      html: template,
    })

    expect(editor.innerHTML).to.equal('<p><a href="https://www.briskine.com">briskine-one</a></p>')
    destroy()
  })

  it('should insert template containing anchor with multiple containers in prosemirror', async () => {
    const template = '<div><div><p><a href="https://www.briskine.com">briskine-one</a></p></div></div>'
    const [editor, destroy] = await setupProseMirror()

    await pageInsertPasteTemplate({
      html: template,
    })

    expect(editor.innerHTML).to.equal('<p><a href="https://www.briskine.com">briskine-one</a></p>')
    destroy()
  })

  it('should insert template containing heading in prosemirror', async () => {
    const template = '<h1>heading 1</h1>'
    const [editor, destroy] = await setupProseMirror()

    await pageInsertPasteTemplate({
      html: template,
    })

    expect(editor.innerHTML).to.equal('<h1>heading 1</h1>')
    destroy()
  })

  it('should insert template containing list in prosemirror', async () => {
    const template = '<ul><li>item</li></ul>'
    const [editor, destroy] = await setupProseMirror()

    await pageInsertPasteTemplate({
      html: template,
    })

    expect(editor.innerHTML).to.equal('<ul><li><p>item</p></li></ul>')
    destroy()
  })

  it('should insert plain text in ckeditor', async () => {
    const [editor, destroy] = await setupCkEditor()
    const template = 'Kind regards'
    await pageInsertPasteTemplate({
      html: template,
    })

    expect(editor.innerHTML).to.equal('<p>Kind regards</p>')
    destroy()
  })

  it('should insert rich text in ckeditor', async () => {
    const [editor, destroy] = await setupCkEditor()
    const template = '<div><strong>Image</strong> <img src="#"></div>'
    await pageInsertPasteTemplate({
      html: template,
    })

    expect(editor.innerHTML).to.equal('<p><strong>Image</strong>&nbsp;<span class="image-inline ck-widget" contenteditable="false"><img src="#"></span>Kind regards</p>')
    destroy()
  })
})
