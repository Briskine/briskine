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
    textarea.focus()
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

  it('should insert like typing, with the native input events', () => {
    const events = []
    const record = (e) => events.push([e.type, e.inputType, e.composed])
    window.addEventListener('beforeinput', record, {capture: true})
    window.addEventListener('input', record, {capture: true})

    insertTextfieldTemplate({
      text: 'test',
    })

    window.removeEventListener('beforeinput', record, {capture: true})
    window.removeEventListener('input', record, {capture: true})
    expect(textarea.value).to.equal('test')
    // only webkit also fires beforeinput for execCommand
    expect(events.filter(([type]) => type === 'input')).to.deep.equal([
      ['input', 'insertText', true],
    ])
  })

  it('should notify listeners outside the shadow root of the textarea', () => {
    // e.g. a web component, that keeps its own value
    const host = document.createElement('div')
    const field = host.attachShadow({mode: 'open'}).appendChild(document.createElement('textarea'))
    document.body.appendChild(host)
    let value = ''
    host.addEventListener('input', () => value = field.value)
    field.focus()

    insertTextfieldTemplate({
      text: 'test',
    })

    host.remove()
    expect(value).to.equal('test')
  })

  it('should let the insert be undone', () => {
    textarea.value = 'pre'
    textarea.setSelectionRange(3, 3)

    insertTextfieldTemplate({
      text: 'test',
    })
    document.execCommand('undo')

    expect(textarea.value).to.equal('pre')
  })

  it('should insert newlines in textarea', () => {
    insertTextfieldTemplate({
      text: 'Kind regards,\nJohnny',
    })

    expect(textarea.value).to.equal('Kind regards,\nJohnny')
  })

  // webkit fires beforeinput, which the page can cancel
  it('should insert when the page cancels the native insert', () => {
    textarea.addEventListener('beforeinput', (e) => e.preventDefault(), {once: true})
    let inputEvents = 0
    const countInput = () => inputEvents++
    textarea.addEventListener('input', countInput)

    insertTextfieldTemplate({
      text: 'test',
    })

    textarea.removeEventListener('input', countInput)
    expect(textarea.value).to.equal('test')
    expect(inputEvents).to.equal(1)
  })

  it('should insert once, when replacing a selection with the same text', () => {
    textarea.value = 'pre test'
    textarea.setSelectionRange(4, 8)

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(textarea.value).to.equal('pre test')
    expect(textarea.selectionStart).to.equal(8)
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

  it('should insert template in input type=email field', () => {
    const input = document.createElement('input')
    input.type = 'email'
    document.body.appendChild(input)
    input.value = 'pre'
    input.focus()

    insertTextfieldTemplate({
      text: 'test',
    })

    expect(input.value).to.equal('pretest')
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

  it('should reject readonly input', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.readOnly = true
    document.body.appendChild(input)

    input.focus()
    expect(insertTextfieldTemplate({ text: 'template' })).to.equal(false)
    expect(input.value).to.equal('')
    input.remove()
  })

  it('should reject aria-readonly input', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.ariaReadOnly = 'true'
    document.body.appendChild(input)

    input.focus()
    expect(insertTextfieldTemplate({ text: 'template' })).to.equal(false)
    expect(input.value).to.equal('')
    input.remove()
  })

  afterAll(() => {
    textarea.remove()
  })
})
