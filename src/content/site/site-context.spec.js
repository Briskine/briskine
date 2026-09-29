import { expect, describe, it, vi, beforeEach } from 'vitest'

const { requests } = vi.hoisted(() => ({ requests: {} }))

vi.mock('../../store/store-content.js', () => ({
  createRequest: (type) => {
    requests[type] = vi.fn()
    return requests[type]
  },
}))

import { getSiteContexts } from './site-context.js'

const contexts = [
  {tabId: 1, url: 'https://briskine.com/a/', title: 'A', data: {}},
  {tabId: 2, url: 'https://briskine.com/b/', title: 'B', data: {}},
]

describe('site-context', () => {
  describe('getSiteContexts', () => {
    beforeEach(() => {
      requests.getTabContexts.mockReset().mockResolvedValue(contexts)
    })

    it('should ask the background for every matching tab', async () => {
      expect(await getSiteContexts('briskine.com')).to.deep.equal(contexts)
      expect(requests.getTabContexts).toHaveBeenCalledWith({pattern: 'briskine.com'})
    })

    it('should not ask without a pattern', async () => {
      expect(await getSiteContexts()).to.deep.equal([])
      expect(requests.getTabContexts).not.toHaveBeenCalled()
    })

    it('should answer an empty list when the background has nothing', async () => {
      requests.getTabContexts.mockResolvedValue(null)

      expect(await getSiteContexts('briskine.com')).to.deep.equal([])
    })

    it('should answer an empty list when the request fails', async () => {
      // eg. the extension was updated under us
      requests.getTabContexts.mockRejectedValue(new Error('Extension context invalidated.'))

      expect(await getSiteContexts('briskine.com')).to.deep.equal([])
    })
  })
})
