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

  it('stays visible without toggling when focus returns from the dialog to the textfield', async () => {
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

    // watch for the visible attribute being removed and re-added,
    // which restarts the fade-out/fade-in animation.
    const mutations = []
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        mutations.push(record.target.hasAttribute('visible'))
      })
    })
    observer.observe(getBubble(), { attributes: true, attributeFilter: ['visible'] })

    // focus returns to the textfield,
    // like when inserting a template or closing the dialog with escape.
    textarea.focus()

    await new Promise(resolve => setTimeout(resolve, 50))
    observer.disconnect()

    expect(mutations).toEqual([])
    expect(getBubble().hasAttribute('visible')).toBe(true)

    dialog.remove()
  })

  it('stays visible when focus moves between two textfields', async () => {
    const first = createTextarea()
    const second = createTextarea()
    // move the second textarea, so the two don't overlap.
    // overlapping textareas cover the bubble position,
    // which makes the occlusion middleware hide it.
    second.style.top = '300px'

    first.focus()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })

    // record the value of the visible attribute before every change.
    // oldValue is captured when the mutation happens,
    // unlike the attribute itself, which we can only read
    // after the observer microtask runs.
    // the bubble should never be hidden while moving to another textfield,
    // it should only be repositioned.
    const oldValues = []
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        oldValues.push(record.oldValue)
      })
    })
    observer.observe(getBubble(), {
      attributes: true,
      attributeFilter: ['visible'],
      attributeOldValue: true,
    })

    second.focus()

    await new Promise(resolve => setTimeout(resolve, 50))
    observer.disconnect()

    // a null oldValue means the bubble was hidden right before the change
    expect(oldValues).not.toContain(null)
    expect(getBubble().hasAttribute('visible')).toBe(true)
  })

  it('hides when focus moves from the dialog to a non-textfield', async () => {
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

    const button = document.createElement('button')
    document.body.appendChild(button)
    button.focus()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(false)
    })

    dialog.remove()
    button.remove()
  })

  it('stops polling for an occluded textfield after moving to another one', async () => {
    // overlapping textareas, so the second one covers
    // the position where the bubble is placed for the first one.
    // this makes the occlusion middleware hide the bubble,
    // which starts polling for the covering element to disappear.
    const first = createTextarea()
    const second = createTextarea()

    first.focus()
    // move to the other textfield right away,
    // while the position update for the first one is still in flight.
    second.focus()

    // let the pending position update for the first textfield resolve.
    // it runs after the first textfield was already cleaned up,
    // and re-creates the polling interval that the clean-up just stopped.
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(getBubble().hasAttribute('visible')).toBe(true)

    destroy()

    // an orphaned polling interval keeps calling computePosition
    // with a bubble that no longer exists, which rejects.
    const rejections = []
    const onRejection = (e) => {
      rejections.push(String(e.reason))
      // don't fail the test run with an unhandled rejection
      e.preventDefault()
    }
    window.addEventListener('unhandledrejection', onRejection)

    // wait for more than the polling interval
    await new Promise(resolve => setTimeout(resolve, 2000))
    window.removeEventListener('unhandledrejection', onRejection)

    expect(rejections).toEqual([])
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

    it('shifts left in ltr and stays visible when initial position is covered', async () => {
      const textarea = createTextarea()
      const coveringElement = document.createElement('div')
      document.body.appendChild(coveringElement)

      vi.spyOn(document, 'elementsFromPoint')
        .mockImplementationOnce(() => [coveringElement, document.body, document.documentElement])
        .mockImplementation(() => [textarea, document.body, document.documentElement])

      textarea.focus()

      await vi.waitFor(() => {
        const bubble = getBubble()
        const textareaRect = textarea.getBoundingClientRect()
        const bubbleLeft = parseInt(bubble.style.left)
        expect(bubble.hasAttribute('visible')).toBe(true)
        expect(bubble.style.visibility).toBe('visible')
        expect(bubbleLeft).toBeGreaterThanOrEqual(textareaRect.left)
        expect(bubbleLeft).toBeLessThan(textareaRect.right)
      })

      coveringElement.remove()
    })

    it('shifts right in rtl and stays visible when initial position is covered', async () => {
      const textarea = createTextarea()
      textarea.style.direction = 'rtl'
      const coveringElement = document.createElement('div')
      document.body.appendChild(coveringElement)

      vi.spyOn(document, 'elementsFromPoint')
        .mockImplementationOnce(() => [coveringElement, document.body, document.documentElement])
        .mockImplementation(() => [textarea, document.body, document.documentElement])

      textarea.focus()

      await vi.waitFor(() => {
        const bubble = getBubble()
        const textareaRect = textarea.getBoundingClientRect()
        const bubbleLeft = parseInt(bubble.style.left)
        expect(bubble.hasAttribute('visible')).toBe(true)
        expect(bubble.style.visibility).toBe('visible')
        expect(bubbleLeft).toBeGreaterThanOrEqual(textareaRect.left)
        expect(bubbleLeft).toBeLessThan(textareaRect.right)
      })

      coveringElement.remove()
    })

    it('does not hide when covered by the shadow host of the textfield', async () => {
      const host = document.createElement('div')
      Object.assign(host.style, {
        position: 'fixed',
        top: '100px',
        left: '100px',
        width: '300px',
        height: '150px',
      })
      document.body.appendChild(host)

      const shadowRoot = host.attachShadow({ mode: 'open' })
      const textarea = document.createElement('textarea')
      Object.assign(textarea.style, { width: '100%', height: '100%' })
      shadowRoot.appendChild(textarea)

      // browsers return the shadow host from elementsFromPoint,
      // not the inner textarea
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue([host, document.body, document.documentElement])

      textarea.focus()

      await vi.waitFor(() => {
        const bubble = getBubble()
        expect(bubble.hasAttribute('visible')).toBe(true)
        expect(bubble.style.visibility).toBe('visible')
      })

      host.remove()
    })
  })
})
