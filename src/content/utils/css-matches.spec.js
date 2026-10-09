import { expect, describe, it, afterEach } from 'vitest'

import cssMatches from './css-matches.js'

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

// stands in for custom elements that wrap a password input, eg. <sl-input>
class FakeInput extends HTMLElement {
  get value () {
    return 'from-getter'
  }
}

if (!customElements.get('fake-input')) {
  customElements.define('fake-input', FakeInput)
}

function expectHidden (record) {
  expect(record.text).to.equal('')
  expect(record.value).to.equal('')
  expect(record.attributes.value).to.equal('')
}

describe('cssMatches', () => {
  it('should hide password fields', () => {
    const $container = markup('<input type="password" class="field" name="pass" value="default">')
    $container.querySelector('.field').value = 'secret'

    const [record] = cssMatches('.field')
    expectHidden(record)
  })

  it('should hide password fields with an uppercase type', () => {
    const $container = markup('<input TYPE="PASSWORD" class="field" value="default">')
    $container.querySelector('.field').value = 'secret'

    expectHidden(cssMatches('.field')[0])
  })

  it('should hide custom elements with a password type', () => {
    markup('<fake-input type="password" class="field" value="secret"></fake-input>')

    expectHidden(cssMatches('.field')[0])
  })

  it('should not hide custom elements with another type', () => {
    markup('<fake-input type="text" class="field" value="visible"></fake-input>')

    const [record] = cssMatches('.field')
    expect(record.value).to.equal('from-getter')
    expect(record.attributes.value).to.equal('visible')
  })

  it('should not hide hidden inputs', () => {
    markup('<input type="hidden" class="field" name="authenticity_token" value="token">')

    const [record] = cssMatches('.field')
    expect(record.value).to.equal('token')
    expect(record.attributes.value).to.equal('token')
  })

  it('should hide fields by their autocomplete token', () => {
    const tokens = [
      'current-password',
      'new-password',
      'one-time-code',
      'cc-number',
      'cc-csc',
      'cc-exp',
      'cc-exp-month',
      'cc-exp-year',
    ]
    const $container = markup(tokens.map((token) => `<input class="field" autocomplete="${token}" value="default">`).join(''))
    $container.querySelectorAll('.field').forEach(($field) => $field.value = 'secret')

    const records = cssMatches('.field')
    expect(records).to.have.length(tokens.length)
    records.forEach(expectHidden)
  })

  it('should hide fields with several autocomplete tokens', () => {
    markup('<input class="field" autocomplete="section-pay billing cc-number" value="4242">')

    expectHidden(cssMatches('.field')[0])
  })

  it('should hide fields with a mixed case autocomplete token', () => {
    markup('<input class="field" autocomplete="CC-Number" value="4242">')

    expectHidden(cssMatches('.field')[0])
  })

  it('should not hide fields with other autocomplete tokens', () => {
    markup('<input class="field" autocomplete="email" value="john@briskine.com">')

    expect(cssMatches('.field')[0].value).to.equal('john@briskine.com')
  })

  it('should hide sensitive selects and their options', () => {
    markup(`
      <select class="field" autocomplete="cc-exp-month">
        <option value="01">01</option>
        <option value="02" selected>02</option>
      </select>
    `)

    // a select has no value attribute
    const [select] = cssMatches('.field')
    expect(select.text).to.equal('')
    expect(select.value).to.equal('')
    cssMatches('.field option').forEach(expectHidden)
    expect(cssMatches('.field option:checked')).to.have.length(0)
  })

  it('should hide options inside an optgroup of a sensitive select', () => {
    markup(`
      <select class="field" autocomplete="cc-exp-year">
        <optgroup label="years">
          <option value="2030" selected>2030</option>
        </optgroup>
      </select>
    `)

    expectHidden(cssMatches('.field option')[0])
  })

  it('should not hide options of an ordinary select', () => {
    markup(`
      <select class="field">
        <option value="ro" selected>Romania</option>
      </select>
    `)

    const [record] = cssMatches('.field option:checked')
    expect(record.text).to.equal('Romania')
    expect(record.value).to.equal('ro')
    expect(record.attributes.value).to.equal('ro')
  })

  it('should not hide datalist options of a sensitive field', () => {
    markup(`
      <input class="field" autocomplete="cc-number" list="cards">
      <datalist id="cards">
        <option value="4242">visa</option>
      </datalist>
    `)

    const [record] = cssMatches('#cards option')
    expect(record.value).to.equal('4242')
    expect(record.attributes.value).to.equal('4242')
  })

  it('should hide the content of token meta tags', () => {
    markup(`
      <meta class="tag" name="csrf-token" content="one">
      <meta class="tag" name="X-XSRF-TOKEN" content="two">
      <meta class="tag" name="csp-nonce" content="three">
    `)

    const records = cssMatches('meta.tag')
    expect(records).to.have.length(3)
    records.forEach((record) => expect(record.attributes.content).to.equal(''))
    expect(records[0].attributes.name).to.equal('csrf-token')
  })

  it('should not hide the content of other meta tags', () => {
    markup('<meta class="tag" name="description" content="templates">')

    expect(cssMatches('meta.tag')[0].attributes.content).to.equal('templates')
  })

  it('should hide sensitive fields in shadow dom', () => {
    const $container = markup('<div class="host"></div>')
    const shadow = $container.querySelector('.host').attachShadow({mode: 'open'})
    shadow.innerHTML = '<input type="password" class="field" value="default">'
    shadow.querySelector('.field').value = 'secret'

    expectHidden(cssMatches('.field')[0])
  })

  it('should not change ordinary fields and text', () => {
    const $container = markup(`
      <input class="field" value="default">
      <textarea class="area">area</textarea>
      <div class="text">some text</div>
    `)
    $container.querySelector('.field').value = 'typed'

    expect(cssMatches('.field')[0].value).to.equal('typed')
    expect(cssMatches('.field')[0].attributes.value).to.equal('default')
    expect(cssMatches('.area')[0].value).to.equal('area')
    expect(cssMatches('.text')[0].text).to.equal('some text')
  })

  it('should keep the other attributes of sensitive fields', () => {
    markup('<input type="password" class="field" id="pass" name="pass" value="secret">')

    const [record] = cssMatches('.field')
    expect(record.attributes).to.deep.equal({
      type: 'password',
      class: 'field',
      id: 'pass',
      name: 'pass',
      value: '',
    })
  })

  it('should keep the number and order of matches', () => {
    markup(`
      <input class="field" name="one" value="one">
      <input type="password" class="field" name="two" value="two">
      <input class="field" name="three" value="three">
    `)

    const records = cssMatches('.field')
    expect(records.map((record) => record.attributes.name)).to.deep.equal(['one', 'two', 'three'])
    expect(records.map((record) => record.value)).to.deep.equal(['one', '', 'three'])
  })
})

describe('cssMatches secret attribute matching', () => {
  it('should not match a sensitive field by a value prefix', () => {
    const $container = markup('<input type="password" class="field">')
    $container.querySelector('.field').setAttribute('value', 'cafe')

    expect(cssMatches('input[value^="ca"]')).to.have.length(0)
    expect(cssMatches('input[value^="xx"]')).to.have.length(0)
  })

  it('should not match a csrf meta by a content prefix', () => {
    markup('<meta name="csrf-token" content="cafe">')

    expect(cssMatches('meta[content^="ca"]')).to.have.length(0)
    expect(cssMatches('meta[content^="xx"]')).to.have.length(0)
  })

  it('should match the same way for every prefix', () => {
    markup('<meta name="csrf-token" content="cafe">')

    const counts = ['a', 'b', 'c', 'd', 'e', 'f'].map((char) => cssMatches(`meta[content^="${char}"]`).length)
    expect(new Set(counts).size).to.equal(1)
  })

  it('should still match non-sensitive elements by value or content', () => {
    markup(`
      <input class="field" value="draft-1">
      <input type="password" class="field" value="draft-2">
    `)

    const records = cssMatches('input[value^="draft"]')
    expect(records).to.have.length(1)
    expect(records[0].attributes.value).to.equal('draft-1')
  })

  it('should still return a sensitive match when the value is not tested', () => {
    markup('<meta name="csrf-token" content="cafe">')

    // selecting by name is fine, the content is already blanked
    const [record] = cssMatches('meta[name="csrf-token"]')
    expect(record.attributes.content).to.equal('')
  })

  it('should keep combinators and type selectors working', () => {
    markup('<div><input type="password" class="field"></div>')

    expect(cssMatches('div input[type="password"]')).to.have.length(1)
  })

  it('should ignore bare attribute presence, which leaks nothing', () => {
    markup('<input type="password" class="field" value="cafe">')

    // [value] is presence only, not a value test, so the match (blanked) stays
    const [record] = cssMatches('input[value]')
    expect(record.attributes.value).to.equal('')
  })

  it('should not match through :has() on a secret attribute', () => {
    markup('<section><meta name="csrf-token" content="cafe"></section>')

    expect(cssMatches('section:has(meta[content^="ca"])')).to.have.length(0)
    expect(cssMatches('section:has(meta[content^="xx"])')).to.have.length(0)
  })

  it('should allow a value test outside a :has()', () => {
    markup('<div><span class="icon"></span><input value="keepme"></div>')

    const records = cssMatches('div:has(.icon) input[value^="keep"]')
    expect(records).to.have.length(1)
    expect(records[0].attributes.value).to.equal('keepme')
  })

  it('should still drop a sensitive match outside a :has()', () => {
    markup('<div><span class="icon"></span><input type="password" value="keepme"></div>')

    expect(cssMatches('div:has(.icon) input[value^="keep"]')).to.have.length(0)
  })
})

describe('cssMatches guessing a hidden value', () => {
  function expectSameMatches (hit, miss) {
    expect(cssMatches(hit).length).to.equal(cssMatches(miss).length)
  }

  const csrfMarkup = '<section><meta name="csrf-token" content="cafe"><span class="after">x</span></section>'

  it('should not match through an escaped attribute name', () => {
    markup(csrfMarkup)
    expectSameMatches('meta[cont\\65nt^="c"]', 'meta[cont\\65nt^="x"]')
  })

  it('should not match through a comment in the attribute selector', () => {
    markup(csrfMarkup)
    expectSameMatches('meta[/**/content^="c"]', 'meta[/**/content^="x"]')
  })

  it('should not match through an attribute namespace', () => {
    markup(csrfMarkup)
    expectSameMatches('meta[*|content^="c"]', 'meta[*|content^="x"]')
    expectSameMatches('meta[|content^="c"]', 'meta[|content^="x"]')
  })

  it('should not match through a mixed case attribute name', () => {
    markup(csrfMarkup)
    expectSameMatches('meta[CONTENT^="c"]', 'meta[CONTENT^="x"]')
  })

  it('should not match through a combinator after the test', () => {
    markup(csrfMarkup)
    expectSameMatches('meta[content^="c"] + span', 'meta[content^="x"] + span')
    expectSameMatches('meta[content^="c"] ~ *', 'meta[content^="x"] ~ *')
  })

  it('should not match through an escaped :has()', () => {
    markup(csrfMarkup)
    expectSameMatches('section:h\\61s(meta[content^="c"])', 'section:h\\61s(meta[content^="x"])')
  })

  it('should not match through :not()', () => {
    markup(csrfMarkup)
    expectSameMatches('meta:not([content^="c"])', 'meta:not([content^="x"])')
  })

  it('should not match a password field through a sibling', () => {
    markup('<div><input type="password" value="cafe"><span>x</span></div>')
    expectSameMatches('input[value^="c"] + span', 'input[value^="x"] + span')
  })

  const expiryMarkup = `
    <select class="exp" autocomplete="cc-exp-month">
      <option value="01">01</option>
      <option value="02">02</option>
      <option value="03" selected>03</option>
      <option value="04">04</option>
    </select>
  `

  it('should not tell which option of a sensitive select is checked', () => {
    markup(expiryMarkup)
    expect(cssMatches('.exp option:checked ~ option')).to.have.length(0)
    expectSameMatches('.exp option:nth-child(3):checked', '.exp option:nth-child(2):checked')
    expectSameMatches('.exp:has(option:nth-child(3):checked)', '.exp:has(option:nth-child(2):checked)')
  })

  it('should not tell which option of a sensitive select is the default', () => {
    markup(expiryMarkup)
    expectSameMatches('.exp option:nth-child(3):default', '.exp option:nth-child(2):default')
  })

  it('should not tell if a password field is empty', () => {
    const $container = markup('<div><input type="password" placeholder="password"><span>x</span></div>')
    const hit = cssMatches('input:placeholder-shown + span').length
    $container.querySelector('input').value = 'secret'
    expect(cssMatches('input:placeholder-shown + span').length).to.equal(hit)
  })

  it('should still match ordinary fields by state', () => {
    markup(`
      <input type="radio" name="plan" value="free">
      <input type="radio" name="plan" value="pro" checked>
    `)

    const [record] = cssMatches('input[name=plan]:checked')
    expect(record.attributes.value).to.equal('pro')
  })

  it('should still match options of an ordinary select by state', () => {
    markup('<select class="country"><option value="ro">Romania</option><option value="fr" selected>France</option></select>')

    expect(cssMatches('.country option:checked')[0].text).to.equal('France')
  })

  it('should still match ordinary meta tags by content', () => {
    markup('<meta class="tag" name="description" content="templates">')

    expect(cssMatches('meta[content^="temp"]')).to.have.length(1)
  })

  it('should keep strings with brackets and colons as they are', () => {
    markup('<a class="link" title="a [b] :checked">x</a>')

    expect(cssMatches('a[title="a [b] :checked"]')).to.have.length(1)
  })

  it('should throw for an invalid selector', () => {
    expect(() => cssMatches('!!!')).to.throw()
  })
})
