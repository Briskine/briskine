import { expect, describe, it, beforeAll } from 'vitest'

import Messenger from './messenger.js'

describe('Messenger', () => {
  const {connect, request} = Messenger('test')
  const {respond} = Messenger('test')
  beforeAll(async () => {
    await connect(self)

    respond('test', () => {
      return 'response'
    })

    respond('test-error', () => {
      throw new Error('failed')
    })

    respond('test-uncloneable-error', () => {
      throw {message: 'uncloneable', callback: () => {}}
    })

    respond('test-uncloneable-response', () => {
      return () => {}
    })

    respond('test-undefined-error', () => {
      throw undefined
    })
  })

  async function rejection (promise) {
    try {
      await promise
    } catch (err) {
      return err
    }

    return null
  }

  it('should respond to single message', async () => {
    const r1 = await request('test')
    expect(r1).to.equal('response')
  })

  it('should respond to sequential messages', async () => {
    const r1 = await request('test')
    const r2 = await request('test')
    expect(r1).to.equal('response')
    expect(r2).to.equal('response')
  })

  it('should respond to parallel messages', async function () {
    const res = await Promise.all([
      request('test'),
      request('test')
    ])

    expect(res).to.deep.equal(['response', 'response'])
  })

  it('should reject with the error thrown by the responder', async () => {
    let error
    try {
      await request('test-error')
    } catch (err) {
      error = err
    }

    expect(error).to.be.an('error')
    expect(error.message).to.equal('failed')
  })

  it('should reject when the error can not be sent back', async () => {
    const error = await rejection(request('test-uncloneable-error'))
    expect(error).to.be.an('error')
    expect(error.message).to.equal('uncloneable')
  })

  it('should reject when the response can not be sent back', async () => {
    const error = await rejection(request('test-uncloneable-response'))
    expect(error).to.be.an('error')
  })

  it('should reject when the responder throws undefined', async () => {
    const error = await rejection(request('test-undefined-error'))
    expect(error).to.be.an('error')
  })

  it('should respond after a failed request of the same type', async () => {
    await rejection(request('test-error'))
    expect(await rejection(request('test-error'))).to.be.an('error')
    expect(await request('test')).to.equal('response')
  })
})
