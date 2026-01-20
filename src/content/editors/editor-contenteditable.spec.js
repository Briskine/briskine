/* globals describe, it, before, after */
import {expect} from 'chai'

import {insertContentEditableTemplate} from './editor-contenteditable.js'

describe('editor ContentEditable', () => {
  let editable
  before(() => {
    editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)
  })

  it('should insert template into contenteditable', () => {
    editable.innerHTML = ''
    editable.focus()

    insertContentEditableTemplate({
      html: '<div>test</div>',
      element: editable,
      focusNode: editable,
      word: {
        start: 0,
        end: 0,
        text: ''
      },
      template: {
        shortcut: ''
      }
    })

    expect(editable.innerHTML).to.equal('<div>test</div>')
  })

  it('should insert template into contenteditable, with preceding text', () => {
    editable.innerHTML = '<div>pre</div>'
    window.getSelection().setBaseAndExtent(editable.firstChild.firstChild, 3, editable.firstChild.firstChild, 3)

    insertContentEditableTemplate({
      html: '<div>test</div>',
      element: editable,
      focusNode: window.getSelection().focusNode,
      word: {
        start: 0,
        end: 0,
        text: ''
      },
      template: {
        shortcut: ''
      }
    })

    expect(editable.innerHTML).to.equal('<div>pre<div>test</div></div>')
  })

  after(() => {
    editable.remove()
  })
})
