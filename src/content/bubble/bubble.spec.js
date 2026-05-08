import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest'

import { setup, destroy, bubbleTagName } from './bubble.js'
import * as store from '../../store/store-content.js'

vi.mock('../../store/store-content.js', () => ({
  getExtensionData: vi.fn(),
  trigger: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}))

vi.mock('../dialog/dialog.js', () => ({
  dialogTagName: 'b-dialog-test',
}))

vi.mock('./bubble.css', () => ({ default: '' }))
vi.mock('../../icons/briskine-logo-small-bare.svg?raw', () => ({ default: '' }))

const dialogTagName = 'b-dialog-test'

function createTextarea (width = 300, height = 100) {
  const el = document.createElement('textarea')
  Object.assign(el.style, {
    position: 'fixed',
    top: '100px',
    left: '100px',
    width: `${width}px`,
    height: `${height}px`,
  })
  document.body.appendChild(el)
  return el
}

function createContentEditable (width = 300, height = 100) {
  const el = document.createElement('div')
  el.setAttribute('contenteditable', 'true')
  Object.assign(el.style, {
    position: 'fixed',
    top: '100px',
    left: '100px',
    width: `${width}px`,
    height: `${height}px`,
  })
  document.body.appendChild(el)
  return el
}

function getBubble () {
  return document.querySelector(bubbleTagName)
}

describe('bubble', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    destroy()

    vi.mocked(store.getExtensionData).mockResolvedValue({
      bubbleAllowlist: [window.location.hostname],
    })

    await setup({ dialog_shortcut: 'ctrl+space' })
  })

  afterEach(() => {
    destroy()
    document.querySelectorAll('textarea, [contenteditable]').forEach(el => el.remove())
  })

  it('creates a bubble element in the document', () => {
    expect(getBubble()).toBeTruthy()
  })

  it('shows for a large textarea on focus', async () => {
    const textarea = createTextarea()
    textarea.focus()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })
  })

  it('shows for a large contenteditable on focus', async () => {
    const editable = createContentEditable()
    editable.focus()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })
  })

  it('does not show for a small textarea', async () => {
    const textarea = createTextarea(50, 20)
    textarea.focus()

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(getBubble().hasAttribute('visible')).toBe(false)
  })

  it('hides when the textarea loses focus', async () => {
    const textarea = createTextarea()
    textarea.focus()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })

    textarea.blur()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(false)
    })
  })

  it('stays visible when focus moves to the dialog', async () => {
    const textarea = createTextarea()
    textarea.focus()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })

    const dialog = document.createElement(dialogTagName)
    dialog.tabIndex = 0
    document.body.appendChild(dialog)
    dialog.focus()

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(getBubble().hasAttribute('visible')).toBe(true)

    dialog.remove()
  })
})
