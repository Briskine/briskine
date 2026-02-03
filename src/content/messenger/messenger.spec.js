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
