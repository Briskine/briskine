import { expect, describe, it, beforeAll, afterAll, beforeEach } from 'vitest'

import { insertTextfieldTemplate } from './editor-textfield.js'

describe('insertTextfieldTemplate', () => {
  let textarea
  beforeAll(() => {
    textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
  })

  beforeEach(() => {
    textarea.value = ''
  })

  it('should insert template in textarea', () => {
    insertTextfieldTemplate({
      text: 'test',
    })

    expect(textarea.value).to.equal('test')
  })

  it('should place the cursor at the end of the inserted template', () => {
    insertTextfieldTemplate({
      text: 'test',
    })

    expect(textarea.selectionEnd).to.equal(4)
  })

  it('should place the cursor at the end, with preceding text', () => {
    textarea.value = 'pre'
    textarea.setSelectionRange(3, 3)

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(textarea.value).to.equal('pretest')
    expect(textarea.selectionStart).to.equal(7)
    expect(textarea.selectionEnd).to.equal(7)
  })

  it('should place the cursor at the end, with preceding spaces', () => {
    textarea.value = '   '
    textarea.setSelectionRange(3, 3)

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(textarea.value).to.equal('   test')
    expect(textarea.selectionStart).to.equal(7)
    expect(textarea.selectionEnd).to.equal(7)
  })

  it('should place the cursor at the end, with preceding selection', () => {
    textarea.value = 't'
    textarea.setSelectionRange(0, 1)

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(textarea.value).to.equal('test')
    expect(textarea.selectionStart).to.equal(4)
    expect(textarea.selectionEnd).to.equal(4)
  })

  it('should place the cursor at the end, with preceding text and selection', () => {
    textarea.value = 'pre t'
    textarea.setSelectionRange(4, 5)

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(textarea.value).to.equal('pre test')
    expect(textarea.selectionStart).to.equal(8)
    expect(textarea.selectionEnd).to.equal(8)
  })

  it('should insert template in input type=text field', () => {
    const input = document.createElement('input')
    input.type = 'text'
    document.body.appendChild(input)
    input.focus()

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(input.value).to.equal('test')
    input.remove()
  })

  it('should insert template in input type=search field', () => {
    const input = document.createElement('input')
    input.type = 'search'
    document.body.appendChild(input)
    input.focus()

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(input.value).to.equal('test')
    input.remove()
  })

  it('should insert template in input with selection and maxlength', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.value = 'pre t'
    input.maxLength = 10
    document.body.appendChild(input)
    input.focus()
    input.setSelectionRange(4, 5)

    insertTextfieldTemplate({
      text: 'Insert templates.',
    })

    expect(input.value).to.equal('pre Insert')
    input.remove()
  })

  afterAll(() => {
    textarea.remove()
  })
})
