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

  after(() => {
    textarea.remove()
  })
})
