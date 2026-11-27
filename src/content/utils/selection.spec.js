import { expect, describe, it, afterEach, vi } from 'vitest'

import { getSelectionRange, setSelectionRange } from './selection.js'

let host = null

function createShadowEditor () {
  host = document.createElement('div')
  document.body.appendChild(host)
  const editor = document.createElement('div')
  editor.contentEditable = 'true'
  editor.textContent = 'hello world'
  host.attachShadow({mode: 'open'}).appendChild(editor)
  editor.focus()
  return editor
}

function stopSelectionChange (e) {
  e.stopImmediatePropagation()
}

describe('selection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.removeEventListener('selectionchange', stopSelectionChange, true)
    host?.remove()
  })

  it('should set the selection when the page stops selectionchange', async () => {
    const editor = createShadowEditor()
    window.addEventListener('selectionchange', stopSelectionChange, true)

    const range = new Range()
    range.setStart(editor.firstChild, 6)
    range.setEnd(editor.firstChild, 11)
    await setSelectionRange(editor, range)

    expect(getSelectionRange(editor).toString()).to.equal('world')
  })

  it.skipIf(typeof Selection.prototype.getComposedRanges !== 'function')(
    'should not get a range when there are no composed ranges',
    () => {
      const editor = createShadowEditor()
      window.getSelection().setBaseAndExtent(editor.firstChild, 0, editor.firstChild, 0)
      vi.spyOn(Selection.prototype, 'getComposedRanges').mockReturnValue([])

      expect(getSelectionRange(editor)).to.equal(null)
    }
  )

  it('should not scroll when setting the selection fails', async () => {
    const editor = createShadowEditor()
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    vi.spyOn(Selection.prototype, 'setBaseAndExtent').mockImplementation(() => {
      throw new Error('setBaseAndExtent')
    })

    const range = new Range()
    range.setStart(editor.firstChild, 6)
    range.setEnd(editor.firstChild, 11)
    await expect(setSelectionRange(editor, range)).rejects.toThrow('setBaseAndExtent')
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(scroll).not.toHaveBeenCalled()
  })
})
