import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest'

const { listeners, tabsQuery, tabsGet, getSettings, trigger, debug } = vi.hoisted(() => ({
  listeners: [],
  tabsQuery: vi.fn(),
  tabsGet: vi.fn(),
  getSettings: vi.fn(),
  trigger: vi.fn(),
  debug: vi.fn(),
}))

// the bundled dep resolves the factory as the namespace, so no default key
vi.mock('webextension-polyfill', () => ({
  runtime: {
    onMessage: {addListener: (listener) => listeners.push(listener)},
    getManifest: () => ({content_scripts: [{matches: ['https://*/*', 'http://*/*']}]}),
  },
  tabs: {query: tabsQuery, get: tabsGet},
}))
vi.mock('../store/store-api.js', () => ({getSettings: getSettings}))
vi.mock('./background-trigger.js', () => ({default: trigger}))
vi.mock('../debug.js', () => ({default: debug}))

import { eventSiteData, eventSiteMatches } from '../config.js'
import './tab-context.js'

const briskineTab = {id: 7, url: 'https://www.briskine.com/messaging/', title: 'Briskine', active: true, windowId: 1}
const olderTab = {id: 8, url: 'https://www.briskine.com/feed/', title: 'Feed', active: false, windowId: 1, lastAccessed: 1}

function request (type, data) {
  return new Promise((resolve) => {
    const handled = listeners[0]({type: type, data: data}, {tab: {windowId: 1}}, resolve)
    if (handled !== true) {
      resolve('not handled')
    }
  })
}

describe('tab-context', () => {
  beforeEach(() => {
    getSettings.mockReset().mockResolvedValue({blacklist: []})
    tabsQuery.mockReset().mockResolvedValue([briskineTab])
    tabsGet.mockReset().mockResolvedValue(briskineTab)
    trigger.mockReset().mockResolvedValue([{}])
    debug.mockReset()
  })

  it('should ignore messages it does not handle', async () => {
    expect(await request('getTemplates', {})).to.equal('not handled')
  })

  describe('getTabContext', () => {
    it('should report the tab it matched', async () => {
      trigger.mockResolvedValue([{subject: 'hello'}])

      expect(await request('getTabContext', {pattern: 'briskine.com'})).to.deep.equal({
        tabId: 7,
        url: 'https://www.briskine.com/messaging/',
        title: 'Briskine',
        data: {subject: 'hello'},
      })
    })

    it('should answer null when no tab matches', async () => {
      expect(await request('getTabContext', {pattern: 'gmail.com'})).to.equal(null)
    })

    it('should answer null for a pattern it refuses', async () => {
      expect(await request('getTabContext', {pattern: '*'})).to.equal(null)
    })

    it('should skip blocklisted tabs', async () => {
      getSettings.mockResolvedValue({blacklist: ['briskine.com']})

      expect(await request('getTabContext', {pattern: 'briskine.com'})).to.equal(null)
    })

    it('should still report a tab with no plugin data', async () => {
      const context = await request('getTabContext', {pattern: 'briskine.com'})

      expect(context.url).to.equal('https://www.briskine.com/messaging/')
      expect(context.data).to.deep.equal({})
    })

    it('should only look at tabs a content script could run in', async () => {
      await request('getTabContext', {pattern: 'briskine.com'})

      // a discarded tab still matched, it just won't answer
      expect(tabsQuery).toHaveBeenCalledWith({url: ['https://*/*', 'http://*/*']})
    })

    it('should pick the tab in view over the order tabs come in', async () => {
      tabsQuery.mockResolvedValue([olderTab, briskineTab])
      trigger.mockResolvedValue([{subject: 'hello'}])

      const context = await request('getTabContext', {pattern: 'briskine.com'})

      expect(context.tabId).to.equal(7)
    })

    it('should move on to the next match when a tab never answers', async () => {
      tabsQuery.mockResolvedValue([briskineTab, olderTab])
      // the restricted tab answers nothing at all, on either frame
      trigger
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValue([{subject: 'from the next tab'}])

      const context = await request('getTabContext', {pattern: 'briskine.com'})

      expect(context.tabId).to.equal(8)
      expect(context.data).to.deep.equal({subject: 'from the next tab'})
    })

    it('should keep the first tab that answers, even with no plugin data', async () => {
      tabsQuery.mockResolvedValue([briskineTab, olderTab])
      trigger
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}])
        .mockResolvedValue([{subject: 'from the next tab'}])

      const context = await request('getTabContext', {pattern: 'briskine.com'})

      expect(context.tabId).to.equal(7)
      expect(context.data).to.deep.equal({})
    })

    it('should report the best match when no tab answers', async () => {
      tabsQuery.mockResolvedValue([briskineTab, olderTab])
      trigger.mockResolvedValue(undefined)

      const context = await request('getTabContext', {pattern: 'briskine.com'})

      expect(context.tabId).to.equal(7)
      expect(context.data).to.deep.equal({})
    })

    it('should prefer the top frame', async () => {
      // every frame answers first, and has data too
      trigger.mockImplementation((event, details, tab, frameId) => {
        if (frameId === 0) {
          return new Promise((resolve) => setTimeout(() => resolve([{subject: 'from the top frame'}])))
        }

        return Promise.resolve([{subject: 'from an iframe'}])
      })

      const context = await request('getTabContext', {pattern: 'briskine.com'})

      expect(context.data).to.deep.equal({subject: 'from the top frame'})
    })

    it('should ask every frame without waiting for the top one', async () => {
      let answerTop = () => {}
      trigger.mockImplementation((event, details, tab, frameId) => {
        if (frameId === 0) {
          return new Promise((resolve) => {
            answerTop = resolve
          })
        }

        return Promise.resolve([{subject: 'from an iframe'}])
      })

      const context = request('getTabContext', {pattern: 'briskine.com'})
      await vi.waitFor(() => expect(trigger).toHaveBeenCalledTimes(2))
      expect(trigger).toHaveBeenCalledWith(eventSiteData, {}, briskineTab, 0)
      expect(trigger).toHaveBeenCalledWith(eventSiteData, {}, briskineTab, undefined)

      // the top frame has nothing
      answerTop([{}])
      expect((await context).data).to.deep.equal({subject: 'from an iframe'})
    })
  })

  describe('getTabContexts', () => {
    // the request comes from window 1
    const otherWindowTab = {id: 1, url: 'https://briskine.com/a/', title: 'A', windowId: 2, index: 0, active: true}
    const laterTab = {id: 2, url: 'https://briskine.com/b/', title: 'B', windowId: 1, index: 3}
    const firstTab = {id: 3, url: 'https://briskine.com/c/', title: 'C', windowId: 1, index: 1}

    const answerByTab = (answers) => (event, details, tab) => Promise.resolve(answers[tab.id])

    beforeEach(() => {
      tabsQuery.mockResolvedValue([otherWindowTab, laterTab, firstTab])
    })

    it('should list every match in tab strip order', async () => {
      trigger.mockImplementation(answerByTab({
        1: [{subject: 'a'}],
        2: [{subject: 'b'}],
        3: [{subject: 'c'}],
      }))

      expect(await request('getTabContexts', {pattern: 'briskine.com'})).to.deep.equal([
        {tabId: 3, url: 'https://briskine.com/c/', title: 'C', data: {subject: 'c'}},
        {tabId: 2, url: 'https://briskine.com/b/', title: 'B', data: {subject: 'b'}},
        {tabId: 1, url: 'https://briskine.com/a/', title: 'A', data: {subject: 'a'}},
      ])
    })

    it('should list a tab that never answers, with no data', async () => {
      trigger.mockImplementation(answerByTab({
        1: [{subject: 'a'}],
        3: [{subject: 'c'}],
      }))

      const contexts = await request('getTabContexts', {pattern: 'briskine.com'})

      expect(contexts.map((context) => context.tabId)).to.deep.equal([3, 2, 1])
      expect(contexts[1].data).to.deep.equal({})
    })

    it('should ask every tab without waiting for the others', async () => {
      // the first tab never answers
      trigger.mockImplementation((event, details, tab) => {
        return tab.id === 3 ? new Promise(() => {}) : Promise.resolve([{}])
      })

      request('getTabContexts', {pattern: 'briskine.com'})

      await vi.waitFor(() => {
        const asked = trigger.mock.calls.map(([, , tab]) => tab.id)
        expect(new Set(asked)).to.deep.equal(new Set([1, 2, 3]))
      })
    })

    it('should answer an empty list when no tab matches', async () => {
      expect(await request('getTabContexts', {pattern: 'gmail.com'})).to.deep.equal([])
    })

    it('should answer an empty list for a pattern it refuses', async () => {
      expect(await request('getTabContexts', {pattern: '*'})).to.deep.equal([])
    })

    it('should skip blocklisted tabs', async () => {
      getSettings.mockResolvedValue({blacklist: ['briskine.com']})

      expect(await request('getTabContexts', {pattern: 'briskine.com'})).to.deep.equal([])
    })
  })

  describe('getSiteMatches', () => {
    it('should read the tab {{#site}} already resolved', async () => {
      trigger.mockResolvedValue([[{text: 'one'}]])

      expect(await request('getSiteMatches', {tabId: 7, selector: '.item'}))
        .to.deep.equal([{text: 'one'}])
      expect(tabsGet).toHaveBeenCalledWith(7)
      expect(trigger).toHaveBeenCalledWith(eventSiteMatches, {selector: '.item'}, briskineTab, 0)
    })

    it('should not query every tab', async () => {
      await request('getSiteMatches', {tabId: 7, selector: '.item'})

      expect(tabsQuery).not.toHaveBeenCalled()
    })

    it('should return no matches when the tab is gone', async () => {
      trigger.mockResolvedValue([[{text: 'one'}]])
      tabsGet.mockRejectedValue(new Error('No tab with id'))

      expect(await request('getSiteMatches', {tabId: 7, selector: '.item'})).to.deep.equal([])
      expect(trigger).not.toHaveBeenCalled()
    })

    it('should return no matches when the tab is blocklisted', async () => {
      // the tab would answer, the blocklist is what stops us
      trigger.mockResolvedValue([[{text: 'one'}]])
      getSettings.mockResolvedValue({blacklist: ['briskine.com']})

      expect(await request('getSiteMatches', {tabId: 7, selector: '.item'})).to.deep.equal([])
      expect(trigger).not.toHaveBeenCalled()
    })

    it('should fall back to every frame when the top frame has none', async () => {
      trigger
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{text: 'from an iframe'}]])

      expect(await request('getSiteMatches', {tabId: 7, selector: '.item'}))
        .to.deep.equal([{text: 'from an iframe'}])
    })
  })

  describe('a tab that never answers', () => {
    const never = () => new Promise(() => {})
    const stuckTab = {id: 9, url: 'https://www.briskine.com/stuck/', title: 'Stuck', active: true, windowId: 1, index: 0}
    const liveTab = {id: 10, url: 'https://www.briskine.com/live/', title: 'Live', active: false, windowId: 1, index: 1}

    // answers for the tabs that do answer, the rest hang
    const answerOnly = (answers) => (event, details, tab, frameId) => {
      const answer = answers[`${tab.id}/${frameId}`]
      return answer ? Promise.resolve(answer) : never()
    }

    beforeEach(() => {
      vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function timedOut (pending) {
      await vi.advanceTimersByTimeAsync(3000)
      return pending
    }

    it('should fall back to every frame when the top frame never answers', async () => {
      trigger.mockImplementation(answerOnly({'7/undefined': [{subject: 'from an iframe'}]}))

      const context = await timedOut(request('getTabContext', {pattern: 'briskine.com'}))

      expect(context.data).to.deep.equal({subject: 'from an iframe'})
    })

    it('should move {{#site}} on to the next match', async () => {
      tabsQuery.mockResolvedValue([stuckTab, liveTab])
      trigger.mockImplementation(answerOnly({'10/0': [{subject: 'live'}]}))

      const context = await timedOut(request('getTabContext', {pattern: 'briskine.com'}))

      expect(context.tabId).to.equal(10)
      expect(context.data).to.deep.equal({subject: 'live'})
    })

    it('should still list the other tabs for {{#eachSite}}', async () => {
      tabsQuery.mockResolvedValue([stuckTab, liveTab])
      trigger.mockImplementation(answerOnly({'10/0': [{subject: 'live'}]}))

      const contexts = await timedOut(request('getTabContexts', {pattern: 'briskine.com'}))

      expect(contexts.map((context) => [context.tabId, context.data])).to.deep.equal([
        [9, {}],
        [10, {subject: 'live'}],
      ])
    })

    it('should return no matches for {{css}}', async () => {
      trigger.mockImplementation(never)

      expect(await timedOut(request('getSiteMatches', {tabId: 7, selector: '.item'}))).to.deep.equal([])
    })

    it('should not give up on a tab that answers in time', async () => {
      trigger.mockImplementation((event, details, tab, frameId) => {
        return frameId === 0
          ? new Promise((resolve) => setTimeout(() => resolve([{subject: 'slow'}]), 2900))
          : never()
      })

      const context = await timedOut(request('getTabContext', {pattern: 'briskine.com'}))

      expect(context.data).to.deep.equal({subject: 'slow'})
    })

    it('should log the tab that did not answer', async () => {
      trigger.mockImplementation(never)

      await timedOut(request('getSiteMatches', {tabId: 7, selector: '.item'}))

      expect(debug).toHaveBeenCalledWith(['tab did not answer', eventSiteMatches, briskineTab.url], 'warn')
    })
  })
})
