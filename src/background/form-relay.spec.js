import { expect, describe, it, vi, beforeEach } from 'vitest'

const { listeners, trigger } = vi.hoisted(() => ({
  listeners: [],
  trigger: vi.fn(),
}))

// the bundled dep resolves the factory as the namespace, so no default key
vi.mock('webextension-polyfill', () => ({
  runtime: {
    id: 'briskine',
    onMessage: {addListener: (listener) => listeners.push(listener)},
  },
}))
vi.mock('./background-trigger.js', () => ({default: trigger}))

import { eventFormShow, eventFormRender, eventSiteData } from '../config.js'
import './form-relay.js'

const tab = {id: 7}
const sender = {
  id: 'briskine',
  tab: tab,
  frameId: 3,
}

function request (data, from = sender) {
  return new Promise((resolve) => {
    const handled = listeners[0]({type: 'formRelay', data: data}, from, resolve)
    if (handled !== true) {
      resolve('not handled')
    }
  })
}

describe('form-relay', () => {
  beforeEach(() => {
    trigger.mockReset().mockResolvedValue([true])
  })

  it('should relay the event to the frame, with the sender frame', async () => {
    const response = await request({
      event: eventFormShow,
      details: {id: 'form'},
      frameId: 0,
    })

    expect(response).to.equal(true)
    expect(trigger).toHaveBeenCalledWith(eventFormShow, {id: 'form', frameId: 3}, tab, 0)
  })

  it('should answer with the frame response', async () => {
    trigger.mockResolvedValue([{html: 'rendered'}])

    expect(await request({
      event: eventFormRender,
      details: {id: 'form'},
      frameId: 3,
    })).to.deep.equal({html: 'rendered'})
  })

  it('should answer null when the frame does not answer', async () => {
    trigger.mockResolvedValue(undefined)

    expect(await request({
      event: eventFormShow,
      details: {},
      frameId: 0,
    })).to.equal(null)
  })

  it('should ignore other requests', async () => {
    const handled = await new Promise((resolve) => {
      resolve(listeners[0]({type: 'getTemplates'}, sender, () => {}))
    })

    expect(handled).to.equal(false)
    expect(trigger).not.toHaveBeenCalled()
  })

  it('should only relay form events', async () => {
    expect(await request({
      event: eventSiteData,
      frameId: 0,
    })).to.equal('not handled')
    expect(trigger).not.toHaveBeenCalled()
  })

  it('should ignore messages without a tab', async () => {
    expect(await request({event: eventFormShow, frameId: 0}, {id: 'briskine'})).to.equal('not handled')
  })

  it('should ignore messages from other extensions', async () => {
    expect(await request({event: eventFormShow, frameId: 0}, {...sender, id: 'other'})).to.equal('not handled')
  })
})
