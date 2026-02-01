import { expect, describe, it, beforeAll, afterAll } from 'vitest'

import { insertExecCommandTemplate } from './editor-execcommand.js'

describe('editor ExecCommand', () => {
  let editable
  beforeAll(() => {
    editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)
  })

  it('should insert template into contenteditable', async () => {
    editable.innerHTML = ''
    editable.focus()

    await insertExecCommandTemplate({
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

  it('should insert template into contenteditable, with preceding text', async () => {
    editable.innerHTML = '<div>pre</div>'
    window.getSelection().setBaseAndExtent(editable.firstChild.firstChild, 3, editable.firstChild.firstChild, 3)

    await insertExecCommandTemplate({
      html: '<div>template <img src="#" alt="image"></div>',
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

    expect(editable.innerHTML).to.equal('<div>pretemplate <img src="#" alt="image"></div>')
  })

  afterAll(() => {
    editable.remove()
  })
})
