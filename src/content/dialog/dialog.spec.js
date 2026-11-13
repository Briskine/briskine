import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest'

// the tests run in an iframe, with no extension in the parent frame
vi.mock('../utils/frame-offset.js', () => ({
  default: async () => ({
    top: 0,
    left: 0,
  }),
}))

import { eventShowDialog, eventDialogShow, eventDialogClose, eventDialogVisibility } from '../../config.js'
import { trigger, on, off } from '../../store/store-content.js'
import { setup, destroy } from './dialog.js'

let relayed = []
let showResponse = true
let visibility = []
let textarea = null

function recordVisibility ({visible}) {
  visibility.push(visible)
}

describe('dialog', () => {
  beforeEach(() => {
    relayed = []
    visibility = []
    showResponse = true

    window.browser.runtime.sendMessage = async ({type, data}) => {
      if (type === 'frameRelay') {
        relayed.push(data)
        if (showResponse instanceof Error) {
          throw showResponse
        }
        return showResponse
      }
    }

    setup({dialog_shortcut: 'ctrl+space'})
    on(eventDialogVisibility, recordVisibility)

    textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
  })

  afterEach(() => {
    off(eventDialogVisibility, recordVisibility)
    destroy()
    textarea.remove()
    delete window.browser.runtime.sendMessage
  })

  it('should show the dialog in the top frame', async () => {
    await trigger(eventShowDialog, {})

    const [request] = relayed
    expect(request.event).to.equal(eventDialogShow)
    expect(request.frameId).to.equal(0)
    expect(request.details.placement).to.equal('bottom-start')
    expect(request.details.direction).to.equal('ltr')
    expect(request.details.keyboardShortcut).to.equal('ctrl+space')
  })

  it('should be visible until the dialog closes', async () => {
    await trigger(eventShowDialog, {})
    expect(visibility).to.deep.equal([true])

    textarea.blur()
    await trigger(eventDialogClose, {})
    expect(visibility).to.deep.equal([true, false])
    expect(document.activeElement).to.equal(textarea)
  })

  it('should not be visible when the top frame does not show the dialog', async () => {
    showResponse = false
    await trigger(eventShowDialog, {})
    expect(visibility).to.deep.equal([true, false])
  })

  it('should not be visible when the top frame is not available', async () => {
    showResponse = new Error('Receiving end does not exist')
    await trigger(eventShowDialog, {})
    expect(visibility).to.deep.equal([true, false])
  })
})
