import { expect, describe, it, vi, beforeEach } from 'vitest'

const { listeners, tabsQuery, getSettings, trigger } = vi.hoisted(() => ({
  listeners: [],
  tabsQuery: vi.fn(),
  getSettings: vi.fn(),
  trigger: vi.fn(),
}))

// the bundled dep resolves the factory as the namespace, so no default key
vi.mock('webextension-polyfill', () => ({
  runtime: {onMessage: {addListener: (listener) => listeners.push(listener)}},
  tabs: {query: tabsQuery},
}))
vi.mock('../store/store-api.js', () => ({getSettings: getSettings}))
vi.mock('./background-trigger.js', () => ({default: trigger}))

import { eventSiteData, eventSiteMatches } from '../config.js'
import './tab-context.js'

const linkedinTab = {id: 7, url: 'https://www.linkedin.com/messaging/', title: 'LinkedIn', active: true, windowId: 1}

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
    tabsQuery.mockReset().mockResolvedValue([linkedinTab])
    trigger.mockReset().mockResolvedValue([{}])
  })

  it('should ignore messages it does not handle', async () => {
    expect(await request('getTemplates', {})).to.equal('not handled')
  })

  describe('getTabContext', () => {
    it('should report the tab it matched', async () => {
      trigger.mockResolvedValue([{subject: 'hello'}])

      expect(await request('getTabContext', {pattern: 'linkedin.com'})).to.deep.equal({
        url: 'https://www.linkedin.com/messaging/',
        title: 'LinkedIn',
        data: {subject: 'hello'},
      })
    })

    it('should not report the tab id', async () => {
      const context = await request('getTabContext', {pattern: 'linkedin.com'})

      expect(context).to.not.have.property('tabId')
    })

    it('should answer null when no tab matches', async () => {
      expect(await request('getTabContext', {pattern: 'gmail.com'})).to.equal(null)
    })

    it('should answer null for a pattern it refuses', async () => {
      expect(await request('getTabContext', {pattern: '*'})).to.equal(null)
    })

    it('should skip blocklisted tabs', async () => {
      getSettings.mockResolvedValue({blacklist: ['linkedin.com']})

      expect(await request('getTabContext', {pattern: 'linkedin.com'})).to.equal(null)
    })

    it('should still report a tab with no plugin data', async () => {
      const context = await request('getTabContext', {pattern: 'linkedin.com'})

      expect(context.url).to.equal('https://www.linkedin.com/messaging/')
      expect(context.data).to.deep.equal({})
    })

    it('should ask the top frame first', async () => {
      trigger.mockResolvedValue([{subject: 'hello'}])
      await request('getTabContext', {pattern: 'linkedin.com'})

      expect(trigger).toHaveBeenCalledTimes(1)
      expect(trigger).toHaveBeenCalledWith(eventSiteData, {}, linkedinTab, 0)
    })

    it('should fall back to every frame when the top frame has nothing', async () => {
      trigger
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{subject: 'from an iframe'}])

      const context = await request('getTabContext', {pattern: 'linkedin.com'})

      expect(trigger).toHaveBeenCalledTimes(2)
      expect(trigger).toHaveBeenLastCalledWith(eventSiteData, {}, linkedinTab, undefined)
      expect(context.data).to.deep.equal({subject: 'from an iframe'})
    })
  })

  describe('getSiteMatches', () => {
    it('should return the matches of the tab it found', async () => {
      trigger.mockResolvedValue([[{text: 'one'}]])

      expect(await request('getSiteMatches', {pattern: 'linkedin.com', selector: '.item'}))
        .to.deep.equal([{text: 'one'}])
      expect(trigger).toHaveBeenCalledWith(eventSiteMatches, {selector: '.item'}, linkedinTab, 0)
    })

    it('should return no matches when no tab matches', async () => {
      expect(await request('getSiteMatches', {pattern: 'gmail.com', selector: '.item'}))
        .to.deep.equal([])
    })

    it('should fall back to every frame when the top frame has none', async () => {
      trigger
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{text: 'from an iframe'}]])

      expect(await request('getSiteMatches', {pattern: 'linkedin.com', selector: '.item'}))
        .to.deep.equal([{text: 'from an iframe'}])
    })
  })
})
