import { expect, describe, it, beforeEach, afterEach } from 'vitest'

import { getWord, selectWord } from './word.js'

describe('word', () => {
  let editable
  beforeEach(() => {
    editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)
    editable.focus()
  })

  it('should get contenteditable word position and text when editable is empty', () => {
    expect(
      getWord(editable)
    ).to.eql({
      start: 0,
      end: 0,
      text: '',
    })
  })

  it('should get contenteditable word, with preceding text', () => {
    editable.innerHTML = 'pre'
    const selection = window.getSelection()
    selection.selectAllChildren(editable)
    selection.collapseToEnd()

    expect(
      getWord(editable)
    ).to.eql({
      start: 0,
      end: 3,
      text: 'pre',
    })
  })

  it('should get contenteditable word, with preceding multi-line text', () => {
    editable.innerHTML = 'text<br>pre'
    const selection = window.getSelection()
    selection.selectAllChildren(editable)
    selection.collapseToEnd()

    expect(
      getWord(editable)
    ).to.eql({
      start: 0,
      end: 3,
      text: 'pre',
    })
  })

  it('should get contenteditable word, with preceding multi-line text, on the second line', () => {
    editable.innerHTML = 'text<br>text pre<br>text'
    const selection = window.getSelection()
    selection.setBaseAndExtent(
      editable.childNodes[2],
      8,
      editable.childNodes[2],
      8,
    )

    expect(
      getWord(editable)
    ).to.eql({
      start: 5,
      end: 8,
      text: 'pre',
    })
  })

  it('should select contenteditable word', async () => {
    editable.innerHTML = 'text'
    const selection = window.getSelection()
    selection.setBaseAndExtent(
      editable.childNodes[0],
      4,
      editable.childNodes[0],
      4,
    )

    await selectWord(editable, {
      start: 0,
      end: 4,
      text: 'text',
    })

    expect(selection.anchorNode).to.equal(editable.childNodes[0])
    expect(selection.anchorOffset).to.equal(0)
    expect(selection.focusNode).to.equal(editable.childNodes[0])
    expect(selection.focusOffset).to.equal(4)
  })

  it('should select contenteditable word, with preceding multi-line text, on the second line', async () => {
    editable.innerHTML = 'text<br>text pre<br>text'
    const selection = window.getSelection()
    selection.setBaseAndExtent(
      editable.childNodes[2],
      8,
      editable.childNodes[2],
      8,
    )

    await selectWord(editable, {
      start: 5,
      end: 8,
      text: 'pre'
    })

    expect(selection.anchorNode).to.equal(editable.childNodes[2])
    expect(selection.anchorOffset).to.equal(5)
    expect(selection.focusNode).to.equal(editable.childNodes[2])
    expect(selection.focusOffset).to.equal(8)
  })

  it('should get contenteditable word, with preceding whitespace and text', () => {
    editable.innerHTML = '   pre'
    const range = document.createRange()
    range.selectNodeContents(editable.lastChild)
    range.collapse()
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    expect(
      getWord(editable)
    ).to.eql({
      start: 3,
      end: 6,
      text: 'pre',
    })
  })

  it('should get textarea word, with preceding whitespace and text', () => {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = '   pre'
    textarea.focus()
    textarea.setSelectionRange(6, 6)

    expect(
      getWord(textarea)
    ).to.eql({
      start: 3,
      end: 6,
      text: 'pre',
    })
    textarea.remove()
  })

  it('should select textarea word', async () => {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = '   pre'
    textarea.focus()
    textarea.setSelectionRange(6, 6)

    await selectWord(textarea, {
      start: 3,
      end: 6,
      text: 'pre'
    })

    expect(textarea.selectionStart).to.equal(3)
    expect(textarea.selectionEnd).to.equal(6)
    textarea.remove()
  })

  it('should get contenteditable word, with preceding whitespace and text, in shadow dom', () => {
    customElements.define(
      'word-editable-shadow',
      class extends HTMLElement {
        constructor() {
          super()
        }
        connectedCallback () {
          const template = '<div contenteditable="true"></div>'
          const shadowRoot = this.attachShadow({mode: 'open'})
          shadowRoot.innerHTML = template
        }
      }
    )

    const shadow = document.createElement('word-editable-shadow')
    document.body.appendChild(shadow)

    const editableShadow = shadow.shadowRoot.querySelector('[contenteditable]')
    editableShadow.innerHTML = '    shadow'

    const range = new Range()
    range.selectNodeContents(editableShadow.lastChild)
    range.collapse()
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)

    expect(
      getWord(editableShadow)
    ).to.eql({
      start: 4,
      end: 10,
      text: 'shadow',
    })

    editableShadow.remove()
  })

  it('should select textarea word in shadow dom', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const template = '<textarea>shadow</textarea>'
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = template

    const textarea = shadow.querySelector('textarea')
    textarea.focus()
    textarea.setSelectionRange(6, 6)

    await selectWord(textarea, {
      start: 0,
      end: 6,
      text: 'shadow'
    })

    expect(textarea.selectionStart).to.equal(0)
    expect(textarea.selectionEnd).to.equal(6)
    host.remove()
  })

  afterEach(() => {
    editable.remove()
  })
})
