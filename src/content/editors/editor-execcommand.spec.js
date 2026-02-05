import { expect, describe, it, beforeAll, afterAll, beforeEach } from 'vitest'

import { insertExecCommandTemplate } from './editor-execcommand.js'

describe('editor ExecCommand', () => {
  let editable
  beforeAll(() => {
    editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)
  })

  beforeEach(() => {
    editable.innerHTML = ''
    editable.focus()
  })

  it('should insert template into contenteditable', async () => {
    await insertExecCommandTemplate({
      html: '<div>test</div>',
      element: editable,
    })

    expect(editable.innerHTML).to.equal('<div>test</div>')
  })

  it('should insert template into contenteditable=plaintext-true', async () => {
    editable.setAttribute('contenteditable', 'plaintext-only')

    await insertExecCommandTemplate({
      text: 'test\ntest2\n[/image.png]',
      element: editable,
    })

    expect(editable.innerHTML).to.equal('test<div>test2</div><div>[/image.png]</div>')
    editable.setAttribute('contenteditable', 'true')
  })

  it('should insert template into contenteditable', async () => {
    await insertExecCommandTemplate({
      html: '<div>test</div>',
      element: editable,
    })

    expect(editable.innerHTML).to.equal('<div>test</div>')
  })

  it('should insert template into contenteditable, with preceding text', async () => {
    editable.innerHTML = '<div>pre</div>'
    window.getSelection().setBaseAndExtent(editable.firstChild.firstChild, 3, editable.firstChild.firstChild, 3)

    await insertExecCommandTemplate({
      html: '<div>template <img src="#" alt="image"></div>',
      element: editable,
    })

    expect(editable.innerHTML).to.equal('<div>pretemplate <img src="#" alt="image"></div>')
  })

  afterAll(() => {
    editable.remove()
  })
})
