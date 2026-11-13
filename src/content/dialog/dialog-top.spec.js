import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

vi.mock('../../store/store-content.js', async (importOriginal) => ({
  ...await importOriginal(),
  getTemplates: vi.fn(async () => []),
  getTags: vi.fn(async () => []),
  getAccount: vi.fn(async () => { throw new Error('logged-out') }),
  getExtensionData: vi.fn(async () => ({})),
}))

import { eventDialogClose } from '../../config.js'
// the tests run in an iframe, where setup doesn't show the dialog
import { respondToShow, destroy } from './dialog-top.js'

let relayed = []

function closeRequests () {
  return relayed.filter((data) => data.event === eventDialogClose)
}

function show () {
  return respondToShow({
    frameId: 3,
    rect: null,
    placement: 'bottom-start',
  })
}

describe('dialog in the top frame', () => {
  beforeEach(() => {
    relayed = []
    window.browser.runtime.sendMessage = async ({type, data}) => {
      if (type === 'frameRelay') {
        relayed.push(data)
      }
    }
  })

  afterEach(() => {
    destroy()
    delete window.browser.runtime.sendMessage
  })

  it('should show the dialog once', async () => {
    expect(await show()).to.equal(true)
    expect(await show()).to.equal(false)
  })

  it('should tell the frame of the editor when it closes with escape', async () => {
    await show()
    await userEvent.keyboard('{Escape}')

    await vi.waitFor(() => {
      expect(closeRequests().length).to.equal(1)
    })
    const [request] = closeRequests()
    expect(request.frameId).to.equal(3)
    expect(request.details.template).to.equal(undefined)
    expect(await show()).to.equal(true)
  })

  it('should tell the frame of the editor when it is removed while open', async () => {
    await show()
    destroy()

    await vi.waitFor(() => {
      expect(closeRequests().length).to.equal(1)
    })
    expect(closeRequests()[0].frameId).to.equal(3)
  })
})
