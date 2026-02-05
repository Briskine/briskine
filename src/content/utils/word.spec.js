import { expect, describe, it, beforeEach, afterEach } from 'vitest'

import { getWord } from './word.js'
import { setSelectionRange } from './selection.js'

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

  it('should get contenteditable word, with preceding whitespace and text', () => {
    editable.innerHTML = '   pre'
    const range = document.createRange()
    range.selectNodeContents(editable.lastChild)
    range.collapse()
    window.getSelection().addRange(range)

    expect(
      getWord(editable)
    ).to.eql({
      start: 3,
      end: 6,
      text: 'pre',
    })
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
    setSelectionRange(editableShadow, range)

    expect(
      getWord(editableShadow)
    ).to.eql({
      start: 4,
      end: 10,
      text: 'shadow',
    })

    editableShadow.remove()
  })

  afterEach(() => {
    editable.remove()
  })
})
