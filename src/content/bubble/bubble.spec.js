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

// webpack uses css-loader with exportType: 'string' for content css.
// vite serves css files as text/css with no default export, so we have to mock
// it until we replace webpack.
vi.mock('./bubble.css', () => ({
  default: ':host { position: fixed; display: none; width: 28px; height: 28px; } :host([visible]) { display: block; }',
}))


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
    vi.restoreAllMocks()
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

  describe('positioning', () => {
    it('sets position styles after focus', async () => {
      const textarea = createTextarea()
      textarea.focus()

      await vi.waitFor(() => {
        const bubble = getBubble()
        expect(bubble.style.left).toBeTruthy()
        expect(bubble.style.top).toBeTruthy()
      })
    })

    it('positions bubble near the top-end corner of the textarea', async () => {
      const textarea = createTextarea(300, 150)
      textarea.focus()

      await vi.waitFor(() => {
        const bubble = getBubble()
        const rect = textarea.getBoundingClientRect()
        const left = parseInt(bubble.style.left)
        const top = parseInt(bubble.style.top)

        expect(left).toBeGreaterThan(rect.left)
        expect(left).toBeLessThanOrEqual(rect.right)
        expect(top).toBeGreaterThanOrEqual(rect.top)
        expect(top).toBeLessThan(rect.bottom)
      })
    })

    it('sets visibility hidden when position is covered by an unrelated element', async () => {
      const textarea = createTextarea()
      const coveringElement = document.createElement('div')
      document.body.appendChild(coveringElement)

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([coveringElement, document.body, document.documentElement])

      textarea.focus()

      await vi.waitFor(() => {
        const bubble = getBubble()
        expect(bubble.hasAttribute('visible')).toBe(true)
        expect(bubble.style.visibility).toBe('hidden')
      })

      coveringElement.remove()
    })

    it('sets visibility visible when covered only by the textarea or its ancestors', async () => {
      const textarea = createTextarea()

      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([textarea, document.body, document.documentElement])

      textarea.focus()

      await vi.waitFor(() => {
        const bubble = getBubble()
        expect(bubble.hasAttribute('visible')).toBe(true)
        expect(bubble.style.visibility).toBe('visible')
      })
    })
  })
})
