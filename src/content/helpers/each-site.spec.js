import { expect, describe, it, beforeAll, beforeEach, vi } from 'vitest'

vi.mock('../site/site-context.js', () => ({
  getSiteContext: vi.fn(),
  getSiteContexts: vi.fn(),
  getSiteMatches: vi.fn(),
}))

import parseTemplate from '../utils/parse-template.js'
import { getSiteContext, getSiteContexts, getSiteMatches } from '../site/site-context.js'

const tabs = [
  {
    tabId: 7,
    url: 'https://www.briskine.com/messaging/',
    title: 'Messaging | Briskine',
    data: {
      from: {name: 'Jane Briskine'},
      to: [{name: 'Michael Briskine', email: 'michael@briskine.com'}],
    },
  },
  {
    tabId: 8,
    url: 'https://www.briskine.com/feed/',
    title: 'Feed | Briskine',
    data: {
      to: [{name: 'John Briskine', email: 'john@briskine.com'}],
    },
  },
]

describe('eachSite handlebars helper', () => {
  beforeAll(() => {
    window.browser.runtime.sendMessage = async ({type}) => {
      if (type === 'getAccount') {
        return {email: 'john@briskine.com', full_name: 'John Briskine'}
      }

      if (type === 'getTemplates') {
        return [
          {
            title: 'Each site partial',
            shortcut: 'eachsitepartial',
            body: '{{#eachSite "briskine.com"}}[{{to.first_name}}]{{/eachSite}}',
          },
        ]
      }

      return []
    }
  })

  beforeEach(() => {
    getSiteContext.mockReset()
    getSiteContexts.mockReset().mockResolvedValue(tabs)
    getSiteMatches.mockReset().mockResolvedValue([])
  })

  it('should render the block for every tab, in order', async () => {
    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{to.first_name}}]{{/eachSite}}'))
      .to.equal('[Michael][John]')
  })

  it('should pass the pattern through', async () => {
    await parseTemplate('{{#eachSite "briskine.com/sales"}}x{{/eachSite}}')
    expect(getSiteContexts).toHaveBeenCalledWith('briskine.com/sales')
  })

  it('should expose each tab on @site', async () => {
    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{@site.tabId}} {{@site.title}}]{{/eachSite}}'))
      .to.equal('[7 Messaging | Briskine][8 Feed | Briskine]')
  })

  it('should expose @index, @first and @last', async () => {
    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{@index}} {{@first}} {{@last}}]{{/eachSite}}'))
      .to.equal('[0 true false][1 false true]')
  })

  it('should mark a single tab as both first and last', async () => {
    getSiteContexts.mockResolvedValue([tabs[0]])

    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{@index}} {{@first}} {{@last}}]{{/eachSite}}'))
      .to.equal('[0 true true]')
  })

  it('should count a tab that did not answer', async () => {
    getSiteContexts.mockResolvedValue([{...tabs[0], data: {}}, tabs[1]])

    expect(await parseTemplate('{{#eachSite "briskine.com"}}{{#if @last}}[{{@index}} {{to.first_name}}]{{/if}}{{/eachSite}}'))
      .to.equal('[1 John]')
  })

  it('should reach the tab index from a nested {{#each}}', async () => {
    expect(await parseTemplate('{{#eachSite "briskine.com"}}{{#each to}}[{{@../index}} {{@index}}]{{/each}}{{/eachSite}}'))
      .to.equal('[0 0][1 0]')
  })

  it('should normalize the data of every tab', async () => {
    expect(await parseTemplate('{{#eachSite "briskine.com"}}{{#each to}}[{{this.email}}]{{/each}}{{/eachSite}}'))
      .to.equal('[michael@briskine.com][john@briskine.com]')
  })

  it('should merge the signed-in account into from', async () => {
    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{from.name}} {{from.email}}]{{/eachSite}}'))
      .to.equal('[Jane Briskine john@briskine.com][John Briskine john@briskine.com]')
  })

  it('should read css from each tab', async () => {
    getSiteMatches.mockImplementation(async (tabId) => [{text: `person in ${tabId}`}])

    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{css ".person"}}]{{/eachSite}}'))
      .to.equal('[person in 7][person in 8]')
    expect(getSiteMatches).toHaveBeenCalledWith(7, '.person')
    expect(getSiteMatches).toHaveBeenCalledWith(8, '.person')
  })

  it('should list a tab that did not answer, with no data', async () => {
    getSiteContexts.mockResolvedValue([tabs[0], {...tabs[1], data: {}}])

    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{to.first_name}} {{@site.tabId}}]{{/eachSite}}'))
      .to.equal('[Michael 7][ 8]')
  })

  it('should reach the composing tab with ../', async () => {
    const local = {to: [{email: 'local@briskine.com'}]}
    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{to.email}} {{../to.email}}]{{/eachSite}}', local))
      .to.equal('[michael@briskine.com local@briskine.com][john@briskine.com local@briskine.com]')
  })

  it('should read this page outside the block', async () => {
    await parseTemplate('{{#eachSite "briskine.com"}}x{{/eachSite}}{{css "title"}}')
    expect(getSiteMatches).not.toHaveBeenCalled()
  })

  it('should render the else branch when no tab matched', async () => {
    getSiteContexts.mockResolvedValue([])
    expect(await parseTemplate('{{#eachSite "briskine.com"}}[{{to.first_name}}]{{else}}no tabs{{/eachSite}}'))
      .to.equal('no tabs')
  })

  it('should resolve the tabs once per template', async () => {
    await parseTemplate('{{#eachSite "briskine.com"}}a{{/eachSite}}{{#eachSite "briskine.com"}}b{{/eachSite}}')
    expect(getSiteContexts).toHaveBeenCalledTimes(1)
  })

  it('should share the cache with partials', async () => {
    const parsed = await parseTemplate('{{#eachSite "briskine.com"}}[{{to.first_name}}]{{/eachSite}} {{> eachsitepartial}}')

    expect(parsed).to.equal('[Michael][John] [Michael][John]')
    expect(getSiteContexts).toHaveBeenCalledTimes(1)
  })

  it('should not share the cache between templates', async () => {
    await parseTemplate('{{#eachSite "briskine.com"}}a{{/eachSite}}')
    await parseTemplate('{{#eachSite "briskine.com"}}a{{/eachSite}}')
    expect(getSiteContexts).toHaveBeenCalledTimes(2)
  })

  it('should not share the cache with {{#site}}', async () => {
    getSiteContext.mockResolvedValue(tabs[1])

    expect(await parseTemplate('{{#site "briskine.com"}}[{{to.first_name}}]{{/site}}{{#eachSite "briskine.com"}}[{{to.first_name}}]{{/eachSite}}'))
      .to.equal('[John][Michael][John]')
  })
})
