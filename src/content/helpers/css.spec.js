import { expect, describe, it, afterEach, beforeAll, beforeEach, vi } from 'vitest'

vi.mock('../site/site-context.js', () => ({
  getSiteContext: vi.fn(),
  getSiteMatches: vi.fn(),
}))

import parseTemplate from '../utils/parse-template.js'
import { getSiteContext, getSiteMatches } from '../site/site-context.js'

let container = null
function markup (html = '') {
  container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

afterEach(() => {
  container?.remove()
  container = null
})

describe('css handlebars helper', () => {
  it('should render the text of the first match', async () => {
    markup('<div class="price">  10 EUR  </div>')
    expect(await parseTemplate('{{css ".price"}}')).to.equal('10 EUR')
  })

  it('should render nothing when there is no match', async () => {
    markup('<div class="price">10 EUR</div>')
    expect(await parseTemplate('[{{css ".missing"}}]')).to.equal('[]')
  })

  it('should render nothing without a selector', async () => {
    expect(await parseTemplate('[{{css}}]')).to.equal('[]')
  })

  it('should escape page content', async () => {
    markup('<div class="note">&lt;b&gt;bold&lt;/b&gt; &amp; more</div>')
    expect(await parseTemplate('{{css ".note"}}')).to.equal('&lt;b&gt;bold&lt;/b&gt; &amp; more')
  })

  it('should render an attribute', async () => {
    markup('<a class="link" href="https://www.briskine.com/">Briskine</a>')
    expect(await parseTemplate('{{css ".link" "href"}}')).to.equal('https://www.briskine.com/')
  })

  it('should render an empty string for a missing attribute', async () => {
    markup('<a class="link">Briskine</a>')
    expect(await parseTemplate('[{{css ".link" "href"}}]')).to.equal('[]')
  })

  it('should read a field value through lookup', async () => {
    const $container = markup('<input class="field" type="text">')
    $container.querySelector('.field').value = 'typed value'
    expect(await parseTemplate('{{lookup (css ".field") "value"}}')).to.equal('typed value')
  })

  it('should read an attribute through a nested lookup too', async () => {
    markup('<a class="link" href="/one">one</a>')
    expect(await parseTemplate('{{lookup (lookup (css ".link") "attributes") "href"}}'))
      .to.equal('/one')
  })

  it('should render the first match when there are several', async () => {
    markup('<div class="item">one</div><div class="item">two</div>')
    expect(await parseTemplate('{{css ".item"}}')).to.equal('one')
  })

  it('should loop over all matches', async () => {
    markup('<div class="item">one</div><div class="item">two</div>')
    expect(await parseTemplate('{{#each (css ".item")}}[{{this}}]{{/each}}'))
      .to.equal('[one][two]')
  })

  it('should loop over an attribute of all matches', async () => {
    markup('<a class="link" href="/one">one</a><a class="link" href="/two">two</a>')
    expect(await parseTemplate('{{#each (css ".link" "href")}}[{{this}}]{{/each}}'))
      .to.equal('[/one][/two]')
  })

  it('should expose attributes on each match', async () => {
    markup('<a class="link" href="/one">one</a><a class="link" href="/two">two</a>')
    expect(await parseTemplate('{{#each (css ".link")}}<a href="{{lookup attributes "href"}}">{{this}}</a>{{/each}}'))
      .to.equal('<a href="/one">one</a><a href="/two">two</a>')
  })

  it('should support with', async () => {
    markup('<a class="link" href="/one">one</a>')
    expect(await parseTemplate('{{#with (css ".link")}}{{this}}{{/with}}')).to.equal('one')
  })

  it('should be falsy when there is no match', async () => {
    markup('<div class="item">one</div>')
    expect(await parseTemplate('{{#if (css ".missing")}}found{{else}}none{{/if}}'))
      .to.equal('none')
    expect(await parseTemplate('{{#if (css ".item")}}found{{else}}none{{/if}}'))
      .to.equal('found')
  })

  it('should pierce shadow dom', async () => {
    const $container = markup('<div class="host"></div>')
    const shadow = $container.querySelector('.host').attachShadow({mode: 'open'})
    shadow.innerHTML = '<div class="shadow-price">20 EUR</div>'
    expect(await parseTemplate('{{css ".shadow-price"}}')).to.equal('20 EUR')
  })

  it('should render the error for an invalid selector', async () => {
    expect(await parseTemplate('{{css "!!!"}}')).to.match(/^<pre>/)
  })

  it('should expose the field value on each match', async () => {
    const $container = markup('<input class="field"><input class="field">')
    $container.querySelectorAll('.field')[0].value = 'one'
    $container.querySelectorAll('.field')[1].value = 'two'
    expect(await parseTemplate('{{#each (css ".field")}}[{{value}}]{{/each}}'))
      .to.equal('[one][two]')
  })

  it('should tell the field value apart from the value attribute', async () => {
    const $container = markup('<input class="field" value="from-attribute">')
    $container.querySelector('.field').value = 'what the user typed'

    expect(await parseTemplate('{{lookup (css ".field") "value"}}'))
      .to.equal('what the user typed')
    expect(await parseTemplate('{{css ".field" "value"}}'))
      .to.equal('from-attribute')
  })

  it('should work inside the cursor helper', async () => {
    markup('<div class="price">10 EUR</div>')
    expect(await parseTemplate('{{#cursor}}{{css ".price"}}{{/cursor}}'))
      .to.contain('10 EUR')
  })

  it('should return light dom matches before shadow dom ones', async () => {
    const $container = markup('<div class="host"></div><div class="item">light</div>')
    const shadow = $container.querySelector('.host').attachShadow({mode: 'open'})
    shadow.innerHTML = '<div class="item">shadow</div>'

    expect(await parseTemplate('{{#each (css ".item")}}[{{this}}]{{/each}}'))
      .to.equal('[light][shadow]')
  })

})

describe('css handlebars helper in a site block', () => {
  beforeAll(() => {
    window.browser.runtime.sendMessage = async ({type}) => {
      if (type === 'getAccount') {
        return {email: 'john@briskine.com'}
      }

      return []
    }
  })

  beforeEach(() => {
    getSiteContext.mockReset()
    getSiteMatches.mockReset()
    getSiteContext.mockResolvedValue({
      tabId: 7,
      url: 'https://www.linkedin.com/',
      title: 'LinkedIn',
      data: {},
    })
    // the real one returns nothing without a selector
    getSiteMatches.mockImplementation(async (tabId, selector) => {
      if (!selector) {
        return []
      }

      return [
        {text: 'remote one', value: '', attributes: {href: '/one'}},
        {text: 'remote two', value: '', attributes: {href: '/two'}},
      ]
    })
  })

  it('should read from the other tab', async () => {
    markup('<div class="item">local</div>')

    expect(await parseTemplate('{{#site "linkedin.com"}}{{css ".item"}}{{/site}}'))
      .to.equal('remote one')
    expect(getSiteMatches).toHaveBeenCalledWith(7, '.item')
  })

  it('should read this page outside a site block', async () => {
    markup('<div class="item">local</div>')

    expect(await parseTemplate('{{css ".item"}}')).to.equal('local')
    expect(getSiteMatches).not.toHaveBeenCalled()
  })

  it('should read this page again after the site block closes', async () => {
    markup('<div class="item">local</div>')

    expect(await parseTemplate('{{#site "linkedin.com"}}{{css ".item"}}{{/site}}|{{css ".item"}}'))
      .to.equal('remote one|local')
  })

  it('should build the same shape as a local read', async () => {
    expect(await parseTemplate('{{#site "linkedin.com"}}{{#each (css ".item")}}[{{this}}:{{lookup attributes "href"}}]{{/each}}{{/site}}'))
      .to.equal('[remote one:/one][remote two:/two]')
  })

  it('should render an attribute', async () => {
    expect(await parseTemplate('{{#site "linkedin.com"}}{{css ".item" "href"}}{{/site}}'))
      .to.equal('/one')
  })

  it('should read each selector once per render', async () => {
    await parseTemplate('{{#site "linkedin.com"}}{{css ".item"}}{{css ".item"}}{{css ".other"}}{{/site}}')

    expect(getSiteMatches).toHaveBeenCalledTimes(2)
  })

  it('should render the error for an invalid selector', async () => {
    expect(await parseTemplate('{{#site "linkedin.com"}}{{css "!!!"}}{{/site}}'))
      .to.match(/^<pre>/)
    expect(getSiteMatches).not.toHaveBeenCalled()
  })

  it('should render nothing without a selector', async () => {
    expect(await parseTemplate('[{{#site "linkedin.com"}}{{css}}{{/site}}]')).to.equal('[]')
  })

  it('should not share a selector between different tabs', async () => {
    getSiteContext.mockImplementation(async (pattern) => ({
      tabId: pattern === 'linkedin.com' ? 7 : 9,
      url: `https://${pattern}/`,
      title: pattern,
      data: {},
    }))
    getSiteMatches.mockImplementation(async (tabId) => {
      return [{text: `from tab ${tabId}`, value: '', attributes: {}}]
    })

    const parsed = await parseTemplate(
      '{{#site "linkedin.com"}}{{css ".item"}}{{/site}}|{{#site "gmail.com"}}{{css ".item"}}{{/site}}'
    )

    expect(parsed).to.equal('from tab 7|from tab 9')
    expect(getSiteMatches).toHaveBeenCalledTimes(2)
  })

  it('should render nothing when the other tab has no match', async () => {
    getSiteMatches.mockResolvedValue([])

    expect(await parseTemplate('[{{#site "linkedin.com"}}{{css ".item"}}{{/site}}]')).to.equal('[]')
  })
})
