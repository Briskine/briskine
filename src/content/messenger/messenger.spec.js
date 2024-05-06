/* globals describe, it, before */
import {expect} from 'chai'

import Messenger from './messenger.js'

describe('Messenger', () => {
  const {connect, request} = Messenger('test')
  const {respond} = Messenger('test')
  before(async () => {
    await connect(self)

    respond('test', async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 100)
      })

      return 'response'
    })
  })

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
})
