import { expect, describe, it, beforeAll, beforeEach, afterAll } from 'vitest'
import { server } from 'vitest/browser'

import {pageInsertPasteTemplate} from './editor-paste.js'

// ckeditor5's core EmitterMixin recurses infinitely on Playwright's
// webkit (WebKitGTK on Linux), even with a minimal plugin set and
// regardless of how ckeditor5 is loaded/bundled. Not reproducible on
// chromium, firefox, or real macOS Safari.
const isWebkit = server.browser === 'webkit'

async function setupProseMirror () {
  let containerId = 'prosemirror-container'

  const $container = document.createElement('div')
  $container.id = containerId
  document.body.appendChild($container)

  const $script = document.createElement('script')
  $script.type = 'module'
  $script.textContent = `
    import {EditorState, EditorView, Schema, DOMParser, schema, addListNodes} from '/vendor/prosemirror.js'

    const $editor = document.getElementById('${containerId}')
    const $content = document.createElement('div')
    document.body.appendChild($editor)

    // Mix the nodes from prosemirror-schema-list into the basic schema to
    // create a schema with list support.
    const mySchema = new Schema({
      nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
      marks: schema.spec.marks
    })

    // no extra plugins: avoids prosemirror-keymap's mismatched prosemirror-state
    // version on the CDN (@^1.0.0 vs @1.4.3) which causes duplicate PluginKey strings.
    window._prosemirrorView = new EditorView($editor, {
      state: EditorState.create({
        doc: DOMParser.fromSchema(mySchema).parse($content),
      })
    })

    // reset to empty state between tests
    window._prosemirrorReset = () => {
      const view = window._prosemirrorView
      view.updateState(EditorState.create({schema: view.state.schema}))
      view.focus()
    }

    window.dispatchEvent(new Event('prosemirror-ready'))
  `

  function destroy() {
    window._prosemirrorView?.destroy()
    window._prosemirrorView = null
    window._prosemirrorReset = null
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
    import ClassicEditor from '/vendor/ckeditor5.js'

    window._ckeditorInstance = await ClassicEditor.create(document.getElementById('${containerId}'), {
      licenseKey: 'GPL',
    })

    window._ckeditorReset = async () => {
      await window._ckeditorInstance.setData('')
      window._ckeditorInstance.editing.view.focus()
    }

    window._ckeditorGetData = () => window._ckeditorInstance.getData()

    window.dispatchEvent(new Event('ckeditor-ready'))
  `

  function destroy() {
    window._ckeditorInstance?.destroy()
    window._ckeditorInstance = null
    window._ckeditorReset = null
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
  describe('prosemirror', function () {
    let editor
    let destroyProseMirror

    beforeAll(async () => {
      [editor, destroyProseMirror] = await setupProseMirror()
    })

    afterAll(() => {
      destroyProseMirror?.()
    })

    beforeEach(() => {
      window._prosemirrorReset?.()
    })

    it('should insert template containing only anchor in prosemirror', async function () {
      const template = '<a href="https://www.briskine.com">briskine-two</a>'
      await pageInsertPasteTemplate({
        html: template,
      })

      expect(editor.innerHTML).to.equal('<p><a href="https://www.briskine.com">briskine-two</a></p>')
    })

    it('should insert template containing anchor with div container in prosemirror', async () => {
      const template = '<div><a href="https://www.briskine.com">briskine-one</a></div>'
      await pageInsertPasteTemplate({
        html: template,
      })

      expect(editor.innerHTML).to.equal('<p><a href="https://www.briskine.com">briskine-one</a></p>')
    })

    it('should insert template containing anchor with multiple containers in prosemirror', async () => {
      const template = '<div><div><p><a href="https://www.briskine.com">briskine-one</a></p></div></div>'
      await pageInsertPasteTemplate({
        html: template,
      })

      expect(editor.innerHTML).to.equal('<p><a href="https://www.briskine.com">briskine-one</a></p>')
    })

    it('should insert template containing heading in prosemirror', async () => {
      const template = '<h1>heading 1</h1>'
      await pageInsertPasteTemplate({
        html: template,
      })

      expect(editor.innerHTML).to.equal('<h1>heading 1</h1>')
    })

    it('should insert template containing list in prosemirror', async () => {
      const template = '<ul><li>item</li></ul>'
      await pageInsertPasteTemplate({
        html: template,
      })

      expect(editor.innerHTML).to.equal('<ul><li><p>item</p></li></ul>')
    })
  })

  describe.skipIf(isWebkit)('ckeditor', function () {
    let destroyCkEditor

    beforeAll(async () => {
      [, destroyCkEditor] = await setupCkEditor()
    })

    afterAll(() => {
      destroyCkEditor?.()
    })

    beforeEach(async () => {
      await window._ckeditorReset?.()
    })

    it('should insert plain text in ckeditor', async () => {
      const template = 'Kind regards'
      await pageInsertPasteTemplate({
        html: template,
      })

      expect(window._ckeditorGetData()).to.equal('<p>Kind regards</p>')
    })

    it('should insert rich text in ckeditor', async () => {
      const template = '<div><strong>Image</strong> <img src="#"></div>'
      await pageInsertPasteTemplate({
        html: template,
      })

      expect(window._ckeditorGetData()).to.equal('<p><strong>Image</strong> <img src="#"></p>')
    })
  })
})
