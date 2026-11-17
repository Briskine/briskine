import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { setup, destroy, bubbleTagName } from './bubble.js'
import * as store from '../../store/store-content.js'
import { eventShowDialog, eventDialogVisibility } from '../../config.js'

vi.mock('../../store/store-content.js', () => ({
  getExtensionData: vi.fn(),
  trigger: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
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
    document.querySelectorAll('textarea, [contenteditable], dialog').forEach(el => el.remove())
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

  it('shows for a single line contenteditable', async () => {
    const editable = createContentEditable(300, 27)
    editable.focus()

    await vi.waitFor(() => {
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })
  })

  it('does not show for a contenteditable shorter than a line', async () => {
    const editable = createContentEditable(300, 26)
    editable.focus()

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(getBubble().hasAttribute('visible')).toBe(false)
  })

  it('moves into the modal dialog of the textfield, and back out', async () => {
    const dialog = document.createElement('dialog')
    document.body.appendChild(dialog)
    const modalTextarea = createTextarea()
    dialog.appendChild(modalTextarea)
    dialog.showModal()

    modalTextarea.focus()
    await vi.waitFor(() => {
      expect(getBubble().parentNode).toBe(dialog)
      expect(getBubble().style.visibility).toBe('visible')
    })

    // the page outside the modal dialog doesn't get clicks
    const {left, top, width, height} = getBubble().getBoundingClientRect()
    expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(getBubble())

    dialog.close()
    createTextarea().focus()
    await vi.waitFor(() => {
      expect(getBubble().parentNode).toBe(document.documentElement)
    })
    expect(getBubble().hasAttribute('visible')).toBe(true)
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

  describe('while the dialog is open', () => {
    function setDialogVisibility (visible) {
      const [, handler] = vi.mocked(store.on).mock.calls.find(([name]) => name === eventDialogVisibility)
      handler({visible})
    }

    async function showFor (textarea) {
      textarea.focus()
      await vi.waitFor(() => {
        expect(getBubble().style.visibility).toBe('visible')
      })
    }

    it('stays visible when focus leaves the textfield', async () => {
      const textarea = createTextarea()
      await showFor(textarea)

      setDialogVisibility(true)
      // focus moves to the dialog in the top frame
      textarea.blur()

      await new Promise(resolve => setTimeout(resolve, 50))
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })

    it('stays visible when the dialog gives focus back to the textfield', async () => {
      const textarea = createTextarea()
      await showFor(textarea)

      setDialogVisibility(true)
      textarea.blur()
      textarea.focus()
      setDialogVisibility(false)

      await new Promise(resolve => setTimeout(resolve, 50))
      expect(getBubble().hasAttribute('visible')).toBe(true)
    })

    it('hides when the dialog closes without focusing the textfield', async () => {
      const textarea = createTextarea()
      await showFor(textarea)

      setDialogVisibility(true)
      textarea.blur()
      setDialogVisibility(false)

      await vi.waitFor(() => {
        expect(getBubble().hasAttribute('visible')).toBe(false)
      })
    })

    it('updates its position when the dialog closes', async () => {
      const textarea = createTextarea()
      await showFor(textarea)
      const {left} = getBubble().getBoundingClientRect()

      setDialogVisibility(true)
      textarea.style.left = '50px'
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(getBubble().getBoundingClientRect().left).toBe(left)

      setDialogVisibility(false)
      await vi.waitFor(() => {
        expect(getBubble().getBoundingClientRect().left).toBe(left - 50)
      })
    })

    it('stays visible when the dialog covers it', async () => {
      const textarea = createTextarea()
      await showFor(textarea)

      setDialogVisibility(true)
      const cover = document.createElement('div')
      Object.assign(cover.style, {
        position: 'fixed',
        inset: '0',
      })
      document.body.appendChild(cover)
      // trigger a position update
      textarea.style.height = '120px'

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(getBubble().style.visibility).toBe('visible')

      cover.remove()
    })
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

  it('does not reposition to a textfield it no longer tracks', async () => {
    const first = createTextarea()
    const second = createTextarea()
    second.style.top = '400px'

    // cover the first textarea, so the position where the bubble
    // is placed for it is occluded.
    // this makes the occlusion middleware hide the bubble,
    // and start polling for the covering element to disappear.
    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '90px',
      left: '90px',
      width: '330px',
      height: '130px',
    })
    document.body.appendChild(overlay)

    first.focus()
    // move to the other textfield right away,
    // while the position update for the first one is still in flight.
    second.focus()

    // the position update for the first textfield resolves
    // after it was already cleaned up, and re-creates the polling interval
    // that the clean-up just stopped.
    // the orphaned interval keeps positioning the bubble
    // for the textfield we stopped tracking.
    await vi.waitFor(() => {
      expect(getBubble().style.visibility).toBe('visible')
    })

    const position = getBubble().style.top

    // wait for more than the polling interval
    await new Promise(resolve => setTimeout(resolve, 1300))

    expect(getBubble().style.top).toBe(position)
    expect(getBubble().style.visibility).toBe('visible')

    overlay.remove()
  })

  it('does not expose its shadow root', () => {
    expect(getBubble().shadowRoot).toBe(null)
  })

  it('opens the dialog when clicked', async () => {
    const textarea = createTextarea()
    textarea.focus()

    await vi.waitFor(() => {
      expect(getBubble().style.visibility).toBe('visible')
    })

    await userEvent.click(getBubble())

    expect(store.trigger).toHaveBeenCalledWith(eventShowDialog, expect.objectContaining({
      target: expect.any(HTMLButtonElement),
    }))
  })

  it('does not open the dialog for a click dispatched on the bubble', async () => {
    const textarea = createTextarea()
    textarea.focus()

    await vi.waitFor(() => {
      expect(getBubble().style.visibility).toBe('visible')
    })

    getBubble().click()

    expect(store.trigger).not.toHaveBeenCalled()
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
