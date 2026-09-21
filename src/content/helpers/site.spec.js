import { expect, describe, it, beforeAll, beforeEach, vi } from 'vitest'

vi.mock('../site/site-context.js', () => ({
  getSiteContext: vi.fn(),
  getSiteMatches: vi.fn(),
}))

import parseTemplate from '../utils/parse-template.js'
import { getSiteContext } from '../site/site-context.js'

const linkedinTab = {
  tabId: 7,
  url: 'https://www.linkedin.com/messaging/',
  title: 'Messaging | LinkedIn',
  data: {
    from: {name: 'Jane Briskine'},
    to: [{name: 'Michael Briskine', email: 'michael@briskine.com'}],
    subject: 'subject',
  },
}

describe('site handlebars helper', () => {
  beforeAll(() => {
    window.browser.runtime.sendMessage = async ({type}) => {
      if (type === 'getAccount') {
        return {email: 'john@briskine.com', full_name: 'John Briskine'}
      }

      if (type === 'getTemplates') {
        return [
          {
            title: 'Site partial',
            shortcut: 'sitepartial',
            body: '{{#site "linkedin.com"}}{{to.first_name}}{{/site}}',
          },
        ]
      }

      return []
    }
  })

  beforeEach(() => {
    getSiteContext.mockReset()
    getSiteContext.mockResolvedValue(linkedinTab)
  })

  it('should switch the context to the other tab', async () => {
    expect(await parseTemplate('{{#site "linkedin.com"}}{{to.first_name}}{{/site}}'))
      .to.equal('Michael')
  })

  it('should pass the pattern through', async () => {
    await parseTemplate('{{#site "linkedin.com/sales"}}x{{/site}}')
    expect(getSiteContext).toHaveBeenCalledWith('linkedin.com/sales')
  })

  it('should normalize the remote data the same way as local data', async () => {
    expect(await parseTemplate('{{#site "linkedin.com"}}{{#each to}}[{{this.email}}]{{/each}}{{/site}}'))
      .to.equal('[michael@briskine.com]')
  })

  it('should merge the signed-in account into from', async () => {
    expect(await parseTemplate('{{#site "linkedin.com"}}{{from.name}} {{from.email}}{{/site}}'))
      .to.equal('Jane Briskine john@briskine.com')
  })

  it('should expose the tab on @site', async () => {
    expect(await parseTemplate('{{#site "linkedin.com"}}{{@site.url}} {{@site.title}}{{/site}}'))
      .to.equal('https://www.linkedin.com/messaging/ Messaging | LinkedIn')
  })

  it('should reach the composing tab with ../', async () => {
    const local = {to: [{email: 'local@briskine.com'}]}
    expect(await parseTemplate('{{#site "linkedin.com"}}{{to.email}} {{../to.email}}{{/site}}', local))
      .to.equal('michael@briskine.com local@briskine.com')
  })

  it('should render the else branch when no tab matched', async () => {
    getSiteContext.mockResolvedValue(null)
    expect(await parseTemplate('{{#site "linkedin.com"}}Hi {{to.first_name}}{{else}}Hi there{{/site}}'))
      .to.equal('Hi there')
  })

  it('should render the main branch when the tab has no plugin data', async () => {
    getSiteContext.mockResolvedValue({...linkedinTab, data: {}})
    expect(await parseTemplate('{{#site "linkedin.com"}}[{{to.first_name}}] {{@site.url}}{{else}}no tab{{/site}}'))
      .to.equal('[] https://www.linkedin.com/messaging/')
  })

  it('should resolve each tab once per template', async () => {
    await parseTemplate('{{#site "linkedin.com"}}a{{/site}}{{#site "linkedin.com"}}b{{/site}}')
    expect(getSiteContext).toHaveBeenCalledTimes(1)
  })

  it('should resolve different patterns separately', async () => {
    await parseTemplate('{{#site "linkedin.com"}}a{{/site}}{{#site "gmail.com"}}b{{/site}}')
    expect(getSiteContext).toHaveBeenCalledTimes(2)
  })

  it('should share the cache with partials', async () => {
    const parsed = await parseTemplate('{{#site "linkedin.com"}}{{to.first_name}}{{/site}} {{> sitepartial}}')

    expect(parsed).to.equal('Michael Michael')
    expect(getSiteContext).toHaveBeenCalledTimes(1)
  })

  it('should share the cache inside a loop', async () => {
    const parsed = await parseTemplate(
      '{{#each list}}{{#site "linkedin.com"}}{{to.first_name}}{{/site}}{{/each}}',
      {list: [1, 2, 3]}
    )

    expect(parsed).to.equal('MichaelMichaelMichael')
    expect(getSiteContext).toHaveBeenCalledTimes(1)
  })

  it('should not share the cache between templates', async () => {
    await parseTemplate('{{#site "linkedin.com"}}a{{/site}}')
    await parseTemplate('{{#site "linkedin.com"}}a{{/site}}')
    expect(getSiteContext).toHaveBeenCalledTimes(2)
  })
})
