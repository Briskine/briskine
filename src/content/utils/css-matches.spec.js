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
    expectHidden(cssMatches('.field option:checked')[0])
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
