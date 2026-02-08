import { expect, describe, it, beforeAll, afterAll, beforeEach } from 'vitest'

import {insertContentEditableTemplate} from './editor-contenteditable.js'

function isFirefox (task) {
  return task.file.projectName.includes('(firefox)')
}

describe('editor ContentEditable', () => {
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

  it('should insert template into contenteditable', () => {
    insertContentEditableTemplate({
      html: '<div>test</div>',
    })

    expect(editable.innerHTML).to.equal('<div>test</div>')
  })

  it('should insert template into contenteditable, with preceding text', () => {
    editable.innerHTML = '<div>pre</div>'
    window.getSelection().setBaseAndExtent(editable.firstChild.firstChild, 3, editable.firstChild.firstChild, 3)

    insertContentEditableTemplate({
      html: '<div>test</div>',
    })

    expect(editable.innerHTML).to.equal('<div>pre<div>test</div></div>')
  })

  it('should insert template into contenteditable=plaintext-only', async ({ task }) => {
    editable.setAttribute('contenteditable', 'plaintext-only')

    await insertContentEditableTemplate({
      text: 'test\ntest2\n[/image.png]',
    })

    const chromiumOutput = 'test<div>test2</div><div>[/image.png]</div>'
    const firefoxOutput = '<div>test</div><div>test2</div><div>[/image.png]</div>'
    if (isFirefox(task)) {
      expect(editable.innerHTML).to.equal(firefoxOutput)
    } else {
      expect(editable.innerHTML).to.equal(chromiumOutput)
    }

    editable.setAttribute('contenteditable', 'true')
  })

  afterAll(() => {
    editable.remove()
  })
})
