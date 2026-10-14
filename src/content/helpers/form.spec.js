import { expect, describe, it, beforeAll, afterAll, vi } from 'vitest'

import parseTemplate, { createSession, renderTemplate } from '../utils/parse-template.js'
import { escapeExpression } from '../../briskbars/briskbars.js'

function premium () {
  window.browser.runtime.sendMessage = async ({type}) => {
    if (type === 'getAccount') {
      return {email: 'john@briskine.com'}
    }

    if (type === 'getPlan') {
      return 'team'
    }

    return []
  }
}

async function render (template, values = {}, mode = 'final') {
  const session = await createSession()
  Object.assign(session.values, values)
  const html = await renderTemplate(template, session, mode)
  return {html, session}
}

describe('form handlebars helpers', () => {
  beforeAll(premium)

  describe('input', () => {
    it('should render a text field in form mode', async () => {
      const {html} = await render('Hi {{input id="name" placeholder="Name" required=true}}', {}, 'form')
      expect(html).to.equal('Hi <input type="text" id="field-name-0" data-form-id="name" aria-label="Name" placeholder="Name" required value="">')
    })

    it('should render the value in final mode', async () => {
      const {html} = await render('Hi {{input id="name"}}', {name: 'Jane & co'})
      expect(html).to.equal('Hi Jane &amp; co')
    })

    it('should render the default value', async () => {
      const {html} = await render('Hi {{input id="name" value="there"}}')
      expect(html).to.equal('Hi there')
    })

    it('should seed values with defaults after a render', async () => {
      const {session} = await render('{{input id="name" value="there"}}{{input type="number" id="amount" value="5"}}{{input type="checkbox" id="ps"}}')
      expect(session.values).to.deep.equal({
        name: 'there',
        amount: 5,
        ps: false,
      })
      expect([...session.fields.keys()]).to.deep.equal(['name', 'amount', 'ps'])
    })

    it('should keep existing values when seeding', async () => {
      const {session} = await render('{{input id="name" value="there"}}', {name: 'Jane'})
      expect(session.values.name).to.equal('Jane')
    })

    it('should render a checked checkbox in form mode', async () => {
      const {html} = await render('{{input type="checkbox" id="ps" label="Add P.S."}}', {ps: true}, 'form')
      expect(html).to.equal('<input type="checkbox" id="field-ps-0" data-form-id="ps" aria-label="Add P.S." checked>')
    })

    it('should not render checkboxes in final mode', async () => {
      const {html} = await render('a{{input type="checkbox" id="ps"}}b', {ps: true})
      expect(html).to.equal('ab')
    })

    it('should render a color field', async () => {
      const {html} = await render('{{input type="color" id="highlight" value="#ffcc00"}}', {}, 'form')
      expect(html).to.equal('<input type="color" id="field-highlight-0" data-form-id="highlight" aria-label="highlight" value="#ffcc00">')
      expect((await render('<span style="color: {{@form.highlight}}">a</span>', {highlight: '#ff0000'})).html).to.equal('<span style="color: #ff0000">a</span>')
    })

    it('should render the other input types', async () => {
      const types = {
        email: 'jane@briskine.com',
        url: 'https://www.briskine.com',
        tel: '+1 555 0100',
        time: '14:30',
        'datetime-local': '2026-10-13T14:30',
        month: '2026-10',
        week: '2026-W42',
      }

      for (const [type, value] of Object.entries(types)) {
        const template = `{{input type="${type}" id="field"}}`
        expect((await render(template, {field: value}, 'form')).html).to.contain(`<input type="${type}" id="field-field-0"`)
        expect((await render(template, {field: value})).html).to.equal(escapeExpression(value))
      }
    })

    it('should parse date values with moment', async () => {
      const dates = {
        '2026-10-13T14:30': '2026-10-13 14:30',
        '2026-10': '2026-10-01 00:00',
        '2026-W42': '2026-10-12 00:00',
      }

      for (const [value, formatted] of Object.entries(dates)) {
        expect((await render('{{moment @form.when format="YYYY-MM-DD HH:mm"}}', {when: value})).html).to.equal(formatted)
      }
    })

    it('should fall back to text for unknown types', async () => {
      const {html} = await render('{{input type="submit" id="name"}}', {}, 'form')
      expect(html).to.contain('<input type="text"')
    })

    it('should number repeated fields with the same id', async () => {
      const {html} = await render('{{input id="name"}}{{input id="name"}}', {name: 'Jane'}, 'form')
      expect(html).to.contain('id="field-name-0"').and.to.contain('id="field-name-1"')
    })

    it('should expose values as @form', async () => {
      const {html} = await render('{{input type="checkbox" id="ps"}}{{#if @form.ps}}P.S. {{@form.name}}{{/if}}', {
        ps: true,
        name: 'Jane',
      })
      expect(html).to.equal('P.S. Jane')
    })

    it('should compare numbers', async () => {
      const {html} = await render('{{input type="number" id="amount"}}{{#if (compare "===" @form.amount 25)}} yes{{/if}}', {amount: 25})
      expect(html).to.equal('25 yes')
    })

    it('should use @form inside #each', async () => {
      const {html} = await render('{{#each list}}{{@form.name}}{{/each}}', {name: 'Jane'})
      expect(html).to.equal('')
      const session = await createSession({list: [1, 2]})
      session.values.name = 'Jane'
      expect(await renderTemplate('{{#each list}}{{@form.name}}{{/each}}', session)).to.equal('JaneJane')
    })

    it('should throw without an id', async () => {
      expect(await parseTemplate('{{input}}')).to.equal('<pre>{{input}} needs an id</pre>')
    })
  })

  describe('textarea', () => {
    it('should render a textarea in form mode', async () => {
      const {html} = await render('{{textarea id="notes" rows=3}}', {notes: 'a < b'}, 'form')
      expect(html).to.equal('<textarea id="field-notes-0" data-form-id="notes" aria-label="notes" rows="3">\na &lt; b</textarea>')
    })

    it('should convert newlines to line breaks in final mode', async () => {
      const {html} = await render('{{textarea id="notes"}}', {notes: 'one\ntwo & three'})
      expect(html).to.equal('one<br>two &amp; three')
    })
  })

  describe('select', () => {
    const template = '{{#select id="tone"}}{{option "Formal"}}{{option "Casual" value="casual"}}{{/select}}'

    it('should render a select in form mode', async () => {
      const {html} = await render(template, {tone: 'casual'}, 'form')
      expect(html).to.equal('<select id="field-tone-0" data-form-id="tone" aria-label="tone"><option value="Formal">Formal</option><option value="casual" selected>Casual</option></select>')
    })

    it('should default to the first option', async () => {
      const {html, session} = await render(template)
      expect(html).to.equal('Formal')
      expect(session.values.tone).to.equal('Formal')
    })

    it('should render the option value', async () => {
      const {html} = await render(template, {tone: 'casual'})
      expect(html).to.equal('casual')
    })

    it('should use the value parameter as default', async () => {
      const {html} = await render('{{#select id="tone" value="casual"}}{{option "Formal"}}{{option "Casual" value="casual"}}{{/select}}')
      expect(html).to.equal('casual')
    })

    it('should support multiple values', async () => {
      const multiple = '{{#select id="tools" multiple=true}}{{option "A"}}{{option "B"}}{{option "C"}}{{/select}}'
      const form = await render(multiple, {tools: ['A', 'C']}, 'form')
      expect(form.html).to.contain('<select id="field-tools-0" data-form-id="tools" aria-label="tools" multiple>')
      expect(form.html).to.contain('<option value="A" selected>A</option><option value="B">B</option><option value="C" selected>C</option>')

      const final = await render(multiple, {tools: ['A', 'C']})
      expect(final.html).to.equal('A, C')
      expect((await render(multiple)).session.values.tools).to.deep.equal([])
    })

    it('should render html from block options', async () => {
      const blocks = '{{#select id="intro"}}{{#option label="Long"}}<p>Dear {{name}},</p>{{/option}}{{option "Short"}}{{/select}}'
      const session = await createSession({name: 'Jane & co'})
      expect(await renderTemplate(blocks, session)).to.equal('<p>Dear Jane &amp; co,</p>')
      expect(await renderTemplate(blocks, session, 'form')).to.contain('<option value="&lt;p&gt;Dear Jane &amp;amp; co,&lt;/p&gt;" selected>Long</option>')
    })

    it('should throw for an option outside a select', async () => {
      expect(await parseTemplate('{{option "Formal"}}')).to.equal('<pre>{{option}} must be used inside {{#select}}</pre>')
    })

    it('should throw for a block option without a label', async () => {
      expect(await parseTemplate('{{#select id="a"}}{{#option}}text{{/option}}{{/select}}')).to.equal('<pre>{{#option}} needs a label</pre>')
    })
  })

  describe('hidden', () => {
    const template = 'a{{#hidden}}<b>note</b>{{input type="checkbox" id="ps" checked=true}}{{/hidden}}b'

    it('should not render in final mode', async () => {
      const {html, session} = await render(template)
      expect(html).to.equal('ab')
      // fields inside still register
      expect(session.values).to.deep.equal({ps: true})
    })

    it('should render in form mode', async () => {
      const {html} = await render(template, {}, 'form')
      expect(html).to.equal('a<span data-briskine-hidden="start"></span><b>note</b><input type="checkbox" id="field-ps-0" data-form-id="ps" aria-label="ps" checked><span data-briskine-hidden="end"></span>b')
    })

    it('should strip whitespace with ~', async () => {
      const {html} = await render('a\n{{~#hidden}}\nnote\n{{/hidden~}}\nb')
      expect(html).to.equal('ab')
    })
  })

  describe('session', () => {
    it('should pick the same random value on every render', async () => {
      const session = await createSession()
      const template = '{{random "a" "b" "c" "d" "e" "f" "g" "h"}}{{random "a" "b" "c" "d" "e" "f" "g" "h"}}'
      const first = await renderTemplate(template, session)
      for (let i = 0; i < 5; i++) {
        expect(await renderTemplate(template, session, 'form')).to.equal(first)
      }
    })

    it('should use the same time on every render', async () => {
      const session = await createSession()
      const template = '{{moment format="HH:mm:ss.SSS"}}'
      const first = await renderTemplate(template, session)
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(await renderTemplate(template, session)).to.equal(first)
    })
  })

  afterAll(() => {
    delete window.browser.runtime.sendMessage
  })
})

describe('form handlebars helpers on the free plan', () => {
  beforeAll(() => {
    window.browser.runtime.sendMessage = async ({type}) => {
      if (type === 'getAccount') {
        return {email: 'john@briskine.com'}
      }

      if (type === 'getPlan') {
        return 'free'
      }

      return []
    }
  })

  it('should return the upgrade message', async () => {
    const html = await parseTemplate('Hi {{input id="name"}}')
    expect(html).to.match(/^<div>Forms are only available for Briskine Premium users\. <a href="[^"]+\/subscription\/" target="gt-dashboard">Upgrade to Premium<\/a><\/div>$/)
  })

  it('should not need premium for hidden', async () => {
    expect(await parseTemplate('a{{#hidden}}note{{/hidden}}b')).to.equal('ab')
  })

  afterAll(() => {
    delete window.browser.runtime.sendMessage
  })
})

describe('form handlebars helpers when logged-out', () => {
  beforeAll(() => {
    window.browser.runtime.sendMessage = async ({type}) => {
      if (type === 'getPlan') {
        return {storeError: 'logged-out'}
      }

      return []
    }
  })

  it('should render fields in development', async () => {
    expect(await parseTemplate('Hi {{input id="name" value="there"}}')).to.equal('Hi there')
  })

  it('should return the upgrade message in production', async () => {
    vi.stubGlobal('ENV', 'production')
    expect(await parseTemplate('Hi {{input id="name"}}')).to.match(/^<div>Forms are only available/)
    vi.unstubAllGlobals()
  })

  afterAll(() => {
    delete window.browser.runtime.sendMessage
  })
})
