import { expect, describe, it, vi, beforeEach } from 'vitest'

const {gmail, outlook, facebook, debug} = vi.hoisted(() => ({
  debug: vi.fn(),
  gmail: {data: vi.fn(), actions: vi.fn()},
  outlook: {data: vi.fn(), actions: vi.fn()},
  // plugins without actions are the reason the list is filtered
  facebook: {data: vi.fn()},
}))

vi.mock('./plugins/index.js', () => ({
  default: [gmail, outlook, facebook],
}))

vi.mock('../debug.js', () => ({default: debug}))

import { getPluginData, runPluginActions } from './plugin.js'

describe('plugin', () => {
  beforeEach(() => {
    for (const plugin of [gmail, outlook, facebook]) {
      plugin.data.mockReset().mockResolvedValue(undefined)
      plugin.actions?.mockReset()
    }

    debug.mockReset()
  })

  describe('getPluginData', () => {
    it('should ask every plugin with the same params', async () => {
      const params = {element: null}
      await getPluginData(params)

      expect(gmail.data).toHaveBeenCalledWith(params)
      expect(outlook.data).toHaveBeenCalledWith(params)
      expect(facebook.data).toHaveBeenCalledWith(params)
    })

    it('should return the data of the plugin that answered', async () => {
      outlook.data.mockResolvedValue({subject: 'hello'})

      expect(await getPluginData({})).to.deep.equal({subject: 'hello'})
    })

    it('should ignore plugins that return nothing', async () => {
      gmail.data.mockResolvedValue(undefined)
      outlook.data.mockResolvedValue(false)
      facebook.data.mockResolvedValue({subject: 'hello'})

      expect(await getPluginData({})).to.deep.equal({subject: 'hello'})
    })

    it('should keep the data of the others when one plugin throws', async () => {
      gmail.data.mockRejectedValue(new Error('boom'))
      outlook.data.mockResolvedValue({subject: 'hello'})

      expect(await getPluginData({})).to.deep.equal({subject: 'hello'})
    })

    it('should return an empty object when no plugin answers', async () => {
      expect(await getPluginData({})).to.deep.equal({})
    })
  })

  describe('runPluginActions', () => {
    it('should run the actions of every plugin that has them', async () => {
      const params = {template: {}}
      await runPluginActions(params)

      expect(gmail.actions).toHaveBeenCalledWith(params)
      expect(outlook.actions).toHaveBeenCalledWith(params)
    })

    it('should keep going when one plugin throws', async () => {
      gmail.actions.mockRejectedValue(new Error('boom'))
      await runPluginActions({})

      expect(outlook.actions).toHaveBeenCalled()
      expect(debug).toHaveBeenCalled()
    })

    it('should stay quiet about plugins that have no actions', async () => {
      await runPluginActions({})

      expect(debug).not.toHaveBeenCalled()
    })
  })
})
