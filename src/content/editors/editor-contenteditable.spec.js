import { expect, describe, it, beforeAll, afterAll, beforeEach } from 'vitest'

import {insertContentEditableTemplate} from './editor-contenteditable.js'

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

  afterAll(() => {
    editable.remove()
  })
})
