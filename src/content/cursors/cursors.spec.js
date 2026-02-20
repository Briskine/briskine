import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setup, destroy, selectFirstCursor, cursorMarker } from './cursors.js'

function cursor (placeholder = '') {
  return cursorMarker + placeholder + cursorMarker
}

describe('Cursors', () => {
  describe('textarea', () => {
    let textarea

    beforeEach(() => {
      textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      setup()
    })

    afterEach(() => {
      destroy()
    })

    it('should navigate to the next cursor marker on Tab', () => {
      const text = `Hello ${cursor('world')}! Next ${cursor('here')}`
      textarea.value = text

      textarea.selectionStart = 0
      textarea.selectionEnd = 0

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      textarea.dispatchEvent(event)

      expect(textarea.selectionStart).to.equal(6)
      expect(textarea.selectionEnd).to.equal(13)
    })

    it('should navigate backwards when Shift+Tab is pressed', () => {
      const text = `${cursor('first')} and ${cursor('second')}`
      textarea.value = text
      // select last cursor
      textarea.selectionStart = text.length - 8
      textarea.selectionEnd = text.length

      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      textarea.dispatchEvent(event)

      expect(textarea.selectionStart).to.equal(0)
      expect(textarea.selectionEnd).to.equal(7)
    })

    it('should jump to the first cursor in a newly inserted template, with pre-existing cursor', () => {
      const template = `cursor=${cursor('target')}`
      const text = `Pre-existing cursor=${cursor()} ${template}`
      textarea.value = text

      textarea.selectionStart = text.length
      textarea.selectionEnd = text.length

      selectFirstCursor({ text: template })

      // 7 is length of text before cursor
      const expectedStart = text.length - template.length + 7
      expect(textarea.selectionStart).to.equal(expectedStart)
      // 8 is cursor + placeholder length
      expect(textarea.selectionEnd).to.equal(expectedStart + 8)
    })

    it('should remove first empty cursor', () => {
      const text = `Text ${cursor()} ${cursor()}`
      textarea.value = text
      textarea.selectionStart = 0
      textarea.selectionEnd = 0

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      textarea.dispatchEvent(event)

      expect(textarea.selectionStart).to.equal(5)
      expect(textarea.selectionEnd).to.equal(5)
      expect(textarea.value).to.equal(`Text  ${cursor()}`)
    })
  })

  describe('contentEditable', () => {
    let editable

    beforeEach(() => {
      editable = document.createElement('div')
      editable.contentEditable = 'true'
      document.body.appendChild(editable)
      editable.focus()

      setup()
    })

    afterEach(() => {
      destroy()
    })

    it('should navigate through text nodes across nested elements', async () => {
      editable.innerHTML = `<div>Go <b>${cursor('now')}</b></div>`

      // cursor is currently at the start
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      editable.dispatchEvent(event)

      const range = window.getSelection().getRangeAt(0)
      expect(range.startContainer.textContent).to.equal('Go ')
      expect(range.startOffset).to.equal(3)
      expect(range.endContainer.textContent).to.equal(cursor('now'))
      expect(range.endOffset).to.equal(5)
    })

    it('should jump to the first cursor in a newly inserted template, with pre-existing cursor and whitespace', () => {
      const template = `
        <div>cursor=${cursor('target')}</div>
      `
      const text = `<div>
        Pre-existing cursor=
        <div>${cursor()}</div>
        ${template}
      </div>`
      editable.innerHTML = text

      // focus is at the end
      const cursorNode = editable.firstChild.children[1].firstChild
      window.getSelection().setBaseAndExtent(cursorNode, 15, cursorNode, 15)

      selectFirstCursor({ text: template })

      const range = window.getSelection().getRangeAt(0)
      expect(range.startContainer.textContent).to.equal(`cursor=${cursor('target')}`)
      expect(range.endContainer.textContent).to.equal(`cursor=${cursor('target')}`)
      expect(range.startOffset).to.equal(7)
      expect(range.endOffset).to.equal(15)
    })

    it('should navigate backwards when Shift+Tab is pressed', () => {
      const html = `<div>cursor1=${cursor('cursor1')} <div>cursor2=${cursor()}</div> <div>cursor3=${cursor('cursor3')}</div></div>`
      editable.innerHTML = html

      // focus is in cursor3 container
      const cursorNode = editable.firstChild.children[1].firstChild
      window.getSelection().setBaseAndExtent(cursorNode, 0, cursorNode, 0)

      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      editable.dispatchEvent(event)

      const range = window.getSelection().getRangeAt(0)

      expect(range.startContainer.textContent).to.equal('cursor2=')
      expect(range.endContainer.textContent).to.equal('cursor2=')
      // range is collapsed because empty cursor contents get deleted
      expect(range.startOffset).to.equal(8)
      expect(range.endOffset).to.equal(8)
    })

    it('should jump to the first cursor and preserve whitespace before the cursor', async () => {
      const text = `pre-text ${cursor()}`
      const html = `<div>${text}</div>`
      editable.innerHTML = html

      // focus is at the end
      const cursorNode = editable.firstChild.firstChild
      window.getSelection().setBaseAndExtent(cursorNode, 11, cursorNode, 11)

      const range = window.getSelection().getRangeAt(0)

      await selectFirstCursor({ text: text })
      expect(range.startOffset).to.equal(9)
      expect(range.endOffset).to.equal(9)

      // simulate typing,
      // to have the browser try to auto-collapse whitespace (without our workaround)
      document.execCommand('insertText', false, 'post-text')
      expect(range.startContainer.textContent).to.equal('pre-text post-text')
    })

    it('should jump to the first cursor and preserve whitespace before and after the cursor', async () => {
      const text = `pre-text ${cursor()} post-text`
      const html = `<div>${text}</div>`
      editable.innerHTML = html

      // focus is at the end
      const cursorNode = editable.firstChild.firstChild
      window.getSelection().setBaseAndExtent(cursorNode, 11, cursorNode, 11)

      const range = window.getSelection().getRangeAt(0)

      await selectFirstCursor({ text: text })
      expect(range.startOffset).to.equal(9)
      expect(range.endOffset).to.equal(9)

      // simulate typing
      document.execCommand('insertText', false, 'x')
      expect(range.startContainer.textContent).to.equal('pre-text x post-text')
    })
  })
})
