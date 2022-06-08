/* globals describe, it, before, after */
import {expect} from 'chai'

import {getSelectedWord} from './autocomplete.js'

describe('getSelectedWord', () => {
  let editable
  before(() => {
    editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)
  })

  it('should get contenteditable word position and text', () => {
    editable.innerHTML = ''
    editable.focus()

    expect(
      getSelectedWord({
        element: editable,
      })
    ).to.eql({
      start: 0,
      end: 0,
      text: '',
    })
  })

  it('should get contenteditable word, with preceding text', () => {
    editable.innerHTML = 'pre'
    const range = document.createRange()
    range.setStartAfter(editable.lastChild)
    range.collapse()
    window.getSelection().addRange(range)

    expect(
      getSelectedWord({
        element: editable,
      })
    ).to.eql({
      start: 0,
      end: 3,
      text: 'pre',
    })
  })

  it('should get contenteditable word, with preceding whitespace and text', () => {
    editable.innerHTML = '   pre'
    const range = document.createRange()
    range.setStartAfter(editable.lastChild)
    range.collapse()
    window.getSelection().addRange(range)

    expect(
      getSelectedWord({
        element: editable,
      })
    ).to.eql({
      start: 3,
      end: 6,
      text: 'pre',
    })
  })

  after(() => {
    editable.remove()
  })
})
