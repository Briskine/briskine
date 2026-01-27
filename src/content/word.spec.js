import { expect, describe, it, beforeEach, afterEach } from 'vitest'

import { getWord } from './word.js'
import getComposedSelection from './utils/selection.js'

describe('getWord', () => {
  let editable
  beforeEach(() => {
    editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)
  })

  it('should get contenteditable word position and text when editable is empty', () => {
    editable.innerHTML = ''
    editable.focus()

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
    const range = document.createRange()
    range.selectNodeContents(editable.lastChild)
    range.collapse()
    window.getSelection().addRange(range)

    expect(
      getWord(editable)
    ).to.eql({
      start: 0,
      end: 3,
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

    const range = document.createRange()
    range.selectNodeContents(editableShadow.lastChild)
    range.collapse()
    const selection = getComposedSelection(editableShadow)
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

  afterEach(() => {
    editable.remove()
  })
})
