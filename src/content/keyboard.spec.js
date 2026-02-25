import { expect, describe, it, beforeEach, vi } from 'vitest'

import { setup, destroy } from './keyboard.js'

import * as store from '../store/store-content.js'

vi.mock('../store/store-content.js', () => ({
  getTemplates: vi.fn()
}))

vi.mock('./autocomplete.js', () => {
  return {
    default: vi.fn()
  }
})

import autocomplete from './autocomplete.js'

function createContentEditable () {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)
  editable.focus()
  return editable
}

function createInput (type = 'text') {
  const editable = document.createElement('input')
  editable.type = type
  document.body.appendChild(editable)
  editable.focus()
  return editable
}

function eventKeyTab() {
  return new KeyboardEvent('keydown', {
    key: 'Tab',
    code: 'Tab',
    keyCode: 9,
    which: 9,
    bubbles: true,
    cancelable: true,
  })
}

describe('keyboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    vi.mocked(store.getTemplates).mockImplementation(() => ([{
      shortcut: 'test',
    }]))

    destroy()
    setup({
      expand_enabled: true,
      expand_shortcut: 'tab'
    })
  })

  it('should run autocomplete in contenteditable', async () => {
    const editable = createContentEditable()
    editable.innerHTML = 'test'
    const selection = window.getSelection()
    selection.setBaseAndExtent(editable.firstChild, 4, editable.firstChild, 4)

    editable.dispatchEvent(eventKeyTab())

    await vi.waitFor(() => {
      expect(autocomplete).toHaveBeenCalled()
    })

    editable.remove()
  })

  it('should run autocomplete in input type=text', async () => {
    const editable = createInput()
    editable.value = 'test'
    editable.setSelectionRange(4, 4)

    editable.dispatchEvent(eventKeyTab())

    await vi.waitFor(() => {
      expect(autocomplete).toHaveBeenCalled()
    })

    editable.remove()
  })

  it('should run autocomplete in input type=email', async () => {
    const editable = createInput('email')
    editable.value = 'test'

    editable.dispatchEvent(eventKeyTab())

    await vi.waitFor(() => {
      expect(autocomplete).toHaveBeenCalled()
    })

    editable.remove()
  })

  // on firefox, Selection is separate from the input.selectionStart/End,
  // so even when we removeAllRanges, input.selectionStart will still be 4.
  // on blink and webkit, Selection is synced with the selection in inputs/textarea,
  // so when we removeAllRanges, input.selectionStart will be 0.
  it('should run autocomplete in input type=text when selection.rangeCount=0', async () => {
    const editable = createInput()
    editable.value = 'test'

    // simulate Selection.rangeCount=0.
    // On Firefox, this doesn't change input.selectionStart.
    // On Chrome, this resets selectionStart to 0.
    window.getSelection().removeAllRanges()

    // set the internal cursor to the end of the word
    // ensures that even on Chrome/Webkit, the logic sees the word
    // before the cursor, regardless of the global Selection.
    editable.setSelectionRange(4, 4)

    editable.dispatchEvent(eventKeyTab())

    await vi.waitFor(() => {
      expect(autocomplete).toHaveBeenCalled()
    })

    editable.remove()
  })
})
