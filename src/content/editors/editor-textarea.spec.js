/* globals describe, it, before, after */
import {expect} from 'chai'

import {insertTextareaTemplate} from './editor-textarea.js'

describe('insertTextareaTemplate', () => {
  let textarea
  before(() => {
    textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
  })

  it('should insert template in textarea', () => {
    textarea.value = ''

    insertTextareaTemplate({
      element: textarea,
      text: 'test',
      quicktext: {
        shortcut: 't'
      },
      word: {
        start: 0,
        end: 0,
        text: ''
      }
    })

    expect(textarea.value).to.equal('test')
  })

  it('should place the cursor at the end of the inserted template', () => {
    textarea.value = ''

    insertTextareaTemplate({
      element: textarea,
      text: 'test',
      quicktext: {
        shortcut: 't'
      },
      word: {
        start: 0,
        end: 0,
        text: ''
      }
    })

    expect(textarea.selectionEnd).to.equal(4)
  })

  it('should place the cursor at the end, with preceding text', () => {
    textarea.value = 'pre'
    textarea.setSelectionRange(3, 3)

    insertTextareaTemplate({
      element: textarea,
      text: 'test',
      quicktext: {
        shortcut: 't'
      },
      word: {
        start: 0,
        end: 3,
        text: 'pre'
      }
    })

    expect(textarea.value).to.equal('pretest')
    expect(textarea.selectionStart).to.equal(7)
    expect(textarea.selectionEnd).to.equal(7)
  })

  it('should place the cursor at the end, with preceding shortcut', () => {
    textarea.value = 't'
    textarea.setSelectionRange(1, 1)

    insertTextareaTemplate({
      element: textarea,
      text: 'test',
      quicktext: {
        shortcut: 't'
      },
      word: {
        start: 0,
        end: 1,
        text: 't'
      }
    })

    expect(textarea.value).to.equal('test')
    expect(textarea.selectionStart).to.equal(4)
    expect(textarea.selectionEnd).to.equal(4)
  })

  it('should place the cursor at the end, with preceding text and shortcut', () => {
    textarea.value = 'pre t'
    textarea.setSelectionRange(5, 5)

    insertTextareaTemplate({
      element: textarea,
      text: 'test',
      quicktext: {
        shortcut: 't'
      },
      word: {
        start: 4,
        end: 5,
        text: 't'
      }
    })

    expect(textarea.value).to.equal('pre test')
    expect(textarea.selectionStart).to.equal(8)
    expect(textarea.selectionEnd).to.equal(8)
  })

  after(() => {
    textarea.remove()
  })
})
