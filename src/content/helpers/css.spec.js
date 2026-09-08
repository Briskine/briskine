import { expect, describe, it, afterEach } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

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
})
