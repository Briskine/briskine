import { expect, describe, it, beforeAll, afterAll, vi } from 'vitest'

import parseTemplate, { createSession, renderTemplate } from '../utils/parse-template.js'
import { escapeExpression, parse } from '../../briskbars/briskbars.js'
import { cursorMarker } from '../cursors/cursors.js'

function premium () {
  window.browser.runtime.sendMessage = async ({type}) => {
    if (type === 'getAccount') {
      return {email: 'john@briskine.com'}
    }

    if (type === 'isFreePlan') {
      return false
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
      expect(html).to.equal('Hi <input type="text" class="form-control" id="field-name-0" data-form-id="name" aria-label="Name" placeholder="Name" required value="">')
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
      expect(html).to.equal('<input type="checkbox" class="form-check-input" id="field-ps-0" data-form-id="ps" aria-label="Add P.S." checked>')
    })

    it('should treat the string false as false', async () => {
      const {html, session} = await render('{{input type="checkbox" id="ps" checked="false"}}{{input id="name" required="false"}}{{#select id="tools" multiple="false"}}{{option "A"}}{{/select}}', {}, 'form')
      expect(html).not.to.contain('checked')
      expect(html).not.to.contain('required')
      expect(html).not.to.contain('multiple')
      expect(session.fields.get('ps').default).to.equal(false)
    })

    it('should not render checkboxes in final mode', async () => {
      const {html} = await render('a{{input type="checkbox" id="ps"}}b', {ps: true})
      expect(html).to.equal('ab')
    })

    it('should render a color field', async () => {
      const {html} = await render('{{input type="color" id="highlight" value="#ffcc00"}}', {}, 'form')
      expect(html).to.equal('<input type="color" class="form-control form-control-color" id="field-highlight-0" data-form-id="highlight" aria-label="highlight" value="#ffcc00">')
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
        expect((await render(template, {field: value}, 'form')).html).to.contain(`<input type="${type}" class="form-control" id="field-field-0"`)
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

  })

  describe('fields without an id', () => {
    // the keys of the fields in the form, in template order
    function keys (html) {
      return [...html.matchAll(/data-form-id="([^"]+)"/g)].map((match) => match[1])
    }

    async function form (template, session) {
      return keys(await renderTemplate(template, session, 'form'))
    }

    it('should render a field without an id', async () => {
      const session = await createSession()
      const html = await renderTemplate('Hi {{input placeholder="Name"}}', session, 'form')
      const [key] = keys(html)
      expect(key).to.match(/^~/)
      expect(html).to.contain('aria-label="Name"')

      session.values[key] = 'Jane'
      expect(await renderTemplate('Hi {{input placeholder="Name"}}', session)).to.equal('Hi Jane')
    })

    it('should not use the key as the label', async () => {
      const {html} = await render('{{input}}', {}, 'form')
      expect(html).not.to.contain('aria-label')
    })

    it('should render textareas and selects without an id', async () => {
      const {html} = await render('{{textarea}}{{#select}}{{option "A"}}{{/select}}', {}, 'form')
      expect(keys(html)).to.have.length(2)
    })

    it('should keep fields with the same options apart', async () => {
      const session = await createSession()
      const template = '{{input placeholder="Note"}} {{input placeholder="Note"}}'
      const [first, second] = await form(template, session)
      expect(first).not.to.equal(second)

      session.values[first] = 'a'
      session.values[second] = 'b'
      expect(await renderTemplate(template, session)).to.equal('a b')
    })

    it('should keep the same keys between renders', async () => {
      const session = await createSession()
      const template = '{{input}}{{textarea}}'
      expect(await form(template, session)).to.deep.equal(await form(template, session))
    })

    it('should not add fields without an id to @form', async () => {
      const session = await createSession()
      const template = '{{input id="name"}}{{input}}{{#each @form}}[{{@key}}]{{/each}}'
      await renderTemplate(template, session)
      expect(await renderTemplate(template, session)).to.equal('[name]')
    })

    it('should keep its value when a field before it appears', async () => {
      const session = await createSession()
      const template = '{{input type="checkbox" id="more"}}{{#if @form.more}}{{input}}{{/if}}{{input}}'
      const [, last] = await form(template, session)
      session.values[last] = 'kept'

      session.values.more = true
      const [, added, stillLast] = await form(template, session)
      expect(stillLast).to.equal(last)
      expect(added).not.to.equal(last)
      expect(await renderTemplate(template, session)).to.equal('kept')
    })

    it('should give every loop item its own value', async () => {
      const session = await createSession({list: ['a', 'b']})
      const template = '{{#each list}}[{{this}}:{{input}}]{{/each}}'
      const [a, b] = await form(template, session)
      session.values[a] = 1
      session.values[b] = 2
      expect(await renderTemplate(template, session)).to.equal('[a:1][b:2]')
    })

    it('should give items with the same content their own value', async () => {
      const session = await createSession({list: ['Pen', 'Pen']})
      const template = '{{#each list}}[{{input}}]{{/each}}'
      const [first, second] = await form(template, session)
      expect(first).not.to.equal(second)
      session.values[first] = 2
      session.values[second] = 5
      expect(await renderTemplate(template, session)).to.equal('[2][5]')
    })

    const sites = '{{#select id="sites" multiple=true}}{{option "Gmail"}}{{option "Outlook"}}{{/select}}'
      + '{{#each @form.sites}}[{{this}}:{{input}}]{{/each}}'

    it('should keep the value of an item when another one is removed', async () => {
      const session = await createSession()
      session.values.sites = ['Gmail', 'Outlook']
      const [, gmail, outlook] = await form(sites, session)
      session.values[gmail] = 'g'
      session.values[outlook] = 'o'

      session.values.sites = ['Outlook']
      expect(await renderTemplate(sites, session)).to.equal('Outlook[Outlook:o]')

      session.values.sites = ['Gmail', 'Outlook']
      expect(await renderTemplate(sites, session)).to.equal('Gmail, Outlook[Gmail:g][Outlook:o]')
    })

    it('should start a new item empty when the selection is replaced', async () => {
      const session = await createSession()
      session.values.sites = ['Gmail']
      const [, gmail] = await form(sites, session)
      session.values[gmail] = 'g'

      session.values.sites = ['Outlook']
      expect(await renderTemplate(sites, session)).to.equal('Outlook[Outlook:]')
    })

    const tags = '{{input id="tags"}}{{#each (text @form.tags "split" ",")}}[{{this}}:{{input}}]{{/each}}'

    it('should start an item empty when its text is edited, and keep the old value', async () => {
      const session = await createSession()
      session.values.tags = 'Gm,Outlook'
      const [, gm, outlook] = await form(tags, session)
      session.values[gm] = 'g'
      session.values[outlook] = 'o'

      session.values.tags = 'Gma,Outlook'
      expect(await renderTemplate(tags, session)).to.equal('Gma,Outlook[Gma:][Outlook:o]')

      session.values.tags = 'Gm,Outlook'
      expect(await renderTemplate(tags, session)).to.equal('Gm,Outlook[Gm:g][Outlook:o]')
    })

    it('should keep values by position with an id from @index', async () => {
      const session = await createSession()
      const template = '{{input id="tags"}}{{#each (text @form.tags "split" ",")}}'
        + '[{{this}}:{{input id=(text "note_" "concat" @index)}}]{{/each}}'
      session.values.tags = 'Gm,Outlook'
      expect(await form(template, session)).to.deep.equal(['tags', 'note_0', 'note_1'])
      session.values.note_0 = 'g'

      session.values.tags = 'Gma,Outlook'
      expect(await renderTemplate(template, session)).to.equal('Gma,Outlook[Gma:g][Outlook:]')
    })

    it('should give every inner item of every outer item its own value', async () => {
      const session = await createSession({outer: ['a', 'b'], inner: ['x', 'y']})
      const template = '{{#each outer}}{{#each @root.inner}}[{{../this}}/{{this}}:{{input}}]{{/each}}{{/each}}'
      const keys = await form(template, session)
      expect(new Set(keys).size).to.equal(4)
      keys.forEach((key, index) => session.values[key] = index)
      expect(await renderTemplate(template, session)).to.equal('[a/x:0][a/y:1][b/x:2][b/y:3]')
    })

    it('should keep keys short for large loop items', async () => {
      const big = {name: 'x'.repeat(5000)}
      const session = await createSession({list: [big, {...big, name: 'y'.repeat(5000)}]})
      const keys = await form('{{#each list}}{{input}}{{/each}}', session)
      expect(new Set(keys).size).to.equal(2)
      keys.forEach((key) => expect(key.length).to.be.below(10))
      for (const text of session.ids.keys()) {
        expect(text.length < 5000 || !text.includes('\n')).to.equal(true)
      }
    })

    it('should tell apart Map items whose keys are objects', async () => {
      const session = await createSession()
      session.context = {m: new Map([[{}, 'x'], [{}, 'y']])}
      const keys = await form('{{#each m}}{{input}}{{/each}}', session)
      expect(new Set(keys).size).to.equal(2)
    })

    it('should show an error for an id that is written but empty', async () => {
      expect(await parseTemplate('{{input id=@indx}}')).to.equal('<pre>{{input}} has an empty id</pre>')
      expect(await parseTemplate('{{input id=""}}')).to.equal('<pre>{{input}} has an empty id</pre>')
      expect(await parseTemplate('{{#each list}}{{input id=this.id}}{{/each}}', {list: [{}]}))
        .to.equal('<pre>{{input}} has an empty id</pre>')
    })

    it('should tell apart Map keys that serialize the same', async () => {
      const session = await createSession()
      session.context = {m: new Map([[null, 'a'], [NaN, 'b'], [Infinity, 'c'], ['null', 'd'], [Symbol('x'), 'e'], [Symbol('x'), 'f']])}
      const keys = await form('{{#each m}}{{input}}{{/each}}', session)
      expect(new Set(keys).size).to.equal(6)
    })

    it('should need an id in a template parsed without its text', async () => {
      expect(await parseTemplate(parse('{{input}}'))).to.equal('<pre>{{input}} needs an id</pre>')
    })

    it('should not take ids that look like generated keys', async () => {
      expect(await parseTemplate('{{input id="~1"}}')).to.equal('<pre>{{input}} ids can\'t start with ~</pre>')
    })

    it('should treat a number id and the same id as text as one field', async () => {
      const {html, session} = await render('{{input id=0}}{{textarea id="0"}}', {}, 'form')
      expect([...session.fields.keys()]).to.deep.equal(['0'])
      expect(html).to.contain('id="field-0-0"').and.to.contain('id="field-0-1"')
    })

    it('should take a number as an id', async () => {
      const session = await createSession({list: ['a']})
      expect(await form('{{#each list}}{{input id=@index}}{{/each}}', session)).to.deep.equal(['0'])
    })

    it('should not show a generated key in select errors', async () => {
      expect(await parseTemplate('{{#select}}{{option "A"}}{{option "A"}}{{/select}}'))
        .to.equal('<pre>{{#select}} has more than one option with the value "A"</pre>')
    })

    it('should keep the values of the body and the extra fields apart', async () => {
      const session = await createSession({list: ['a']})
      const body = '{{#each list}}{{input}}{{/each}}'
      const subject = 'Re: {{#each list}}{{input}}{{/each}}'
      const [bodyKey] = await form(body, session)
      const [subjectKey] = await form(subject, session)
      expect(bodyKey).not.to.equal(subjectKey)
    })
  })

  describe('textarea', () => {
    it('should render a textarea in form mode', async () => {
      const {html} = await render('{{textarea id="notes" rows=3}}', {notes: 'a < b'}, 'form')
      expect(html).to.equal('<textarea class="form-control" id="field-notes-0" data-form-id="notes" aria-label="notes" rows="3">\na &lt; b</textarea>')
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
      expect(html).to.equal('<select class="form-select" id="field-tone-0" data-form-id="tone" aria-label="tone"><option value="Formal">Formal</option><option value="casual" selected>Casual</option></select>')
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
      expect(form.html).to.contain('<select class="form-select" id="field-tools-0" data-form-id="tools" aria-label="tools" size="3" multiple>')
      expect(form.html).to.contain('<option value="A" selected>A</option><option value="B">B</option><option value="C" selected>C</option>')

      const final = await render(multiple, {tools: ['A', 'C']})
      expect(final.html).to.equal('A, C')
      expect((await render(multiple)).session.values.tools).to.deep.equal([])
    })

    it('should show at most six options in multiple selects', async () => {
      const options = Array.from({length: 10}, (_, i) => `{{option "${i}"}}`).join('')
      const {html} = await render(`{{#select id="many" multiple=true}}${options}{{/select}}`, {}, 'form')
      expect(html).to.contain(' size="6" multiple>')
    })

    it('should use the size parameter', async () => {
      const {html} = await render('{{#select id="tools" multiple=true size=2}}{{option "A"}}{{option "B"}}{{option "C"}}{{/select}}', {}, 'form')
      expect(html).to.contain(' size="2" multiple>')
    })

    it('should not set a size on single selects', async () => {
      const {html} = await render('{{#select id="tone"}}{{option "Formal"}}{{option "Casual"}}{{/select}}', {}, 'form')
      expect(html).not.to.contain('size=')
    })

    it('should render html from block options', async () => {
      const blocks = '{{#select id="intro"}}{{#option label="Long"}}<p>Dear {{name}},</p>{{/option}}{{option "Short"}}{{/select}}'
      const session = await createSession({name: 'Jane & co'})
      expect(await renderTemplate(blocks, session)).to.equal('<p>Dear Jane &amp; co,</p>')
      expect(await renderTemplate(blocks, session, 'form')).to.contain('<option value="Long" selected>Long</option>')
    })

    it('should render the current html of the selected block option', async () => {
      const blocks = '{{input id="name"}}{{#select id="intro"}}{{option "Short"}}{{#option label="Long"}}<p>Dear {{@form.name}},</p>{{/option}}{{/select}}'
      const session = await createSession()
      Object.assign(session.values, {name: 'Ann', intro: 'Long'})
      await renderTemplate(blocks, session, 'form')
      session.values.name = 'Anna'
      expect(await renderTemplate(blocks, session, 'form')).to.contain('<option value="Long" selected>Long</option>')
      expect(await renderTemplate(blocks, session)).to.equal('Anna<p>Dear Anna,</p>')
    })

    it('should keep the cursor in block options', async () => {
      const {html} = await render('{{#select id="intro"}}{{#option label="Long"}}<p>Hi {{cursor}}</p>{{/option}}{{/select}}')
      expect(html).to.equal(`<p>Hi ${cursorMarker}${cursorMarker}</p>`)
    })

    it('should select a block option by value', async () => {
      const {html} = await render('{{#select id="intro" value="long"}}{{#option label="Short"}}Hi{{/option}}{{#option label="Long" value="long"}}Hello there{{/option}}{{/select}}')
      expect(html).to.equal('Hello there')
    })

    it('should insert nothing for an empty block option', async () => {
      const {html} = await render('{{#select id="intro"}}{{#option label="None"}}{{/option}}{{/select}}')
      expect(html).to.equal('')
    })

    it('should throw for options with the same value', async () => {
      expect(await parseTemplate('{{#select id="a"}}{{#option label="Long"}}a{{/option}}{{option "Long"}}{{/select}}')).to.equal('<pre>{{#select id="a"}} has more than one option with the value "Long"</pre>')
    })

    it('should default to the first option for an unknown value', async () => {
      const template = '{{#select id="tone" value="Neutral"}}{{option "Formal"}}{{option "Casual"}}{{/select}}'
      expect((await render(template)).html).to.equal('Formal')
      expect((await render(template, {}, 'form')).html).to.contain('<option value="Formal" selected>Formal</option>')
    })

    it('should only select known values in multiple selects', async () => {
      const {html} = await render('{{#select id="tools" multiple=true value="B"}}{{option "A"}}{{option "B"}}{{/select}}{{#select id="none" multiple=true value="X"}}{{option "A"}}{{/select}}')
      expect(html).to.equal('B')
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
      expect(html).to.equal('a<span data-briskine-hidden="start"></span><b>note</b><input type="checkbox" class="form-check-input" id="field-ps-0" data-form-id="ps" aria-label="ps" checked><span data-briskine-hidden="end"></span>b')
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

    it('should pick random values separately for each template', async () => {
      const random = Math.random
      const numbers = [0.1, 0.9]
      Math.random = () => numbers.shift()

      const session = await createSession()
      expect(await renderTemplate('{{random "a" "b"}}', session)).to.equal('a')
      expect(await renderTemplate('{{random "x" "y"}}', session)).to.equal('y')
      expect(await renderTemplate('{{random "a" "b"}}', session)).to.equal('a')

      Math.random = random
    })

    it('should use the default of a field that appears in the form', async () => {
      const session = await createSession()
      const template = '{{input type="checkbox" id="discount"}}{{#if @form.discount}}{{input type="number" id="percent" value=15}}% off, with the code SORRY{{@form.percent}}{{/if}}'
      expect(await renderTemplate(template, session)).to.equal('')

      session.values.discount = true
      expect(await renderTemplate(template, session, 'form')).to.contain('% off, with the code SORRY15')
    })

    it('should use the defaults of fields that appear behind a checked box', async () => {
      const session = await createSession()
      const template = '{{input type="checkbox" id="discount" checked=true}}{{#if @form.discount}}{{input type="color" id="highlight" value="#ffe066"}}{{#if @form.highlight}}{{input id="code" value="SORRY"}}{{/if}}{{/if}}[{{@form.highlight}} {{@form.code}}]'
      expect(await renderTemplate(template, session)).to.equal('#ffe066SORRY[#ffe066 SORRY]')
    })

    it('should use the default of a field before the field', async () => {
      const session = await createSession()
      expect(await renderTemplate('Hi {{@form.name}}, {{input id="name" value="there"}}', session)).to.equal('Hi there, there')
    })

    it('should use the default of a field in the extra fields', async () => {
      const session = await createSession()
      await renderTemplate('Hi {{input id="name" value="there"}}', session)
      expect(await renderTemplate('#{{input id="order" value="10482"}} for {{@form.name}}, {{@form.order}}', session)).to.equal('#10482 for there, 10482')
    })

    it('should stop rendering again when every render adds a field', async () => {
      const session = await createSession()
      const html = await renderTemplate('{{input id="a"}}{{#each @form}}{{input id=(text "x" "concat" @key)}}{{/each}}', session)
      expect(html).to.be.a('string')
      expect(Object.keys(session.values).length).to.be.below(20)
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

      if (type === 'isFreePlan') {
        return true
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
      if (type === 'isFreePlan') {
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
