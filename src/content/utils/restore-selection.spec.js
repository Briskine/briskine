import { expect, describe, it, afterEach } from 'vitest'

import { saveSelection, restoreSelection } from './restore-selection.js'

let element = null

function create (html) {
  const container = document.createElement('div')
  container.innerHTML = html
  element = container.firstElementChild
  document.body.appendChild(element)
  element.focus()
  return element
}

afterEach(() => {
  element?.remove()
  element = null
})

describe('restoreSelection', () => {
  it('should restore the caret in a textarea', async () => {
    const textarea = create('<textarea>hello world</textarea>')
    textarea.setSelectionRange(5, 5)
    const selection = saveSelection(textarea)

    // closing a modal dialog can give focus back with the caret at the start
    textarea.blur()
    textarea.setSelectionRange(0, 0)
    await restoreSelection(textarea, selection)

    expect(document.activeElement).to.equal(textarea)
    expect([textarea.selectionStart, textarea.selectionEnd]).to.deep.equal([5, 5])
  })

  it('should restore the selection in an input', async () => {
    const input = create('<input type="text" value="hello world">')
    input.setSelectionRange(2, 7, 'backward')
    const selection = saveSelection(input)

    input.setSelectionRange(0, 0)
    await restoreSelection(input, selection)

    expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).to.deep.equal([2, 7, 'backward'])
  })

  it('should only focus an email input', async () => {
    const input = create('<input type="email" value="a@b.c">')
    input.blur()
    await restoreSelection(input, saveSelection(input))
    expect(document.activeElement).to.equal(input)
  })

  it('should restore the range in a contenteditable', async () => {
    const editable = create('<div contenteditable="true">hello world</div>')
    const range = document.createRange()
    range.setStart(editable.firstChild, 5)
    range.collapse(true)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
    const selection = saveSelection(editable)

    window.getSelection().collapse(editable.firstChild, 0)
    await restoreSelection(editable, selection)

    expect(window.getSelection().focusOffset).to.equal(5)
  })
})
