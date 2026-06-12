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

describe('Messenger routing', () => {
  it('should reject when request is called before connect', async function () {
    const {request} = Messenger('unconnected')
    await expect(request('test')).rejects.toThrow('Messenger "unconnected" not connected')
  })

  it('should ignore messages with unrelated scope', async function () {
    const {connect, request} = Messenger('scope-a')
    const {respond: respondA} = Messenger('scope-a')

    respondA('echo', () => 'ok')

    await connect(self)

    self.postMessage({
      _briskine: true,
      scope: 'scope-b',
      from: 'ext-id',
      kind: 'request',
      id: 'req-ext',
      type: 'echo',
      options: {},
    }, '*')

    await new Promise((resolve) => setTimeout(resolve, 50))

    const result = await request('echo')
    expect(result).to.equal('ok')
  })

  it('should route requests only to the correct scope', async function () {
    const {connect: cA, request: reqA} = Messenger('route-a')
    const {connect: cB, request: reqB} = Messenger('route-b')

    const {respond: rAClient} = Messenger('route-a')
    const {respond: rBClient} = Messenger('route-b')

    rAClient('ping', () => 'pong-a')
    rBClient('ping', () => 'pong-b')

    await cA(self)
    await cB(self)

    const resA = await reqA('ping')
    const resB = await reqB('ping')

    expect(resA).to.equal('pong-a')
    expect(resB).to.equal('pong-b')
  })

  it('should not process its own messages', async function () {
    const {connect, request, respond: rServer} = Messenger('self-srv')
    const {respond: rClient} = Messenger('self-srv')

    let clientCalled = 0
    let serverCalled = 0

    rClient('verify', () => {
      clientCalled++
      return 'client-resp'
    })

    rServer('verify', () => {
      serverCalled++
      return 'server-resp'
    })

    await connect(self)
    const result = await request('verify')

    expect(result).to.equal('client-resp')
    expect(clientCalled).to.equal(1)
    expect(serverCalled).to.equal(0)
  })
})
