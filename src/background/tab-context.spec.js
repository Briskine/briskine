import { expect, describe, it, vi, beforeEach } from 'vitest'

const { listeners, tabsQuery, tabsGet, getSettings, trigger } = vi.hoisted(() => ({
  listeners: [],
  tabsQuery: vi.fn(),
  tabsGet: vi.fn(),
  getSettings: vi.fn(),
  trigger: vi.fn(),
}))

// the bundled dep resolves the factory as the namespace, so no default key
vi.mock('webextension-polyfill', () => ({
  runtime: {onMessage: {addListener: (listener) => listeners.push(listener)}},
  tabs: {query: tabsQuery, get: tabsGet},
}))
vi.mock('../store/store-api.js', () => ({getSettings: getSettings}))
vi.mock('./background-trigger.js', () => ({default: trigger}))

import { eventSiteData, eventSiteMatches } from '../config.js'
import './tab-context.js'

const briskineTab = {id: 7, url: 'https://www.briskine.com/messaging/', title: 'Briskine', active: true, windowId: 1}

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

    it('should ask the top frame first', async () => {
      trigger.mockResolvedValue([{subject: 'hello'}])
      await request('getTabContext', {pattern: 'briskine.com'})

      expect(trigger).toHaveBeenCalledTimes(1)
      expect(trigger).toHaveBeenCalledWith(eventSiteData, {}, briskineTab, 0)
    })

    it('should fall back to every frame when the top frame has nothing', async () => {
      trigger
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{subject: 'from an iframe'}])

      const context = await request('getTabContext', {pattern: 'briskine.com'})

      expect(trigger).toHaveBeenCalledTimes(2)
      expect(trigger).toHaveBeenLastCalledWith(eventSiteData, {}, briskineTab, undefined)
      expect(context.data).to.deep.equal({subject: 'from an iframe'})
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
})
