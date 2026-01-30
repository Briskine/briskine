import { expect, describe, it, beforeAll, afterAll, afterEach } from 'vitest'

import parseTemplate from './parse-template.js'
import {destroy} from '../sandbox/sandbox-parent.js'

import {compileTemplate} from '../sandbox/sandbox.js'
import 'moment/dist/locale/ja'

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const day = now.getDate()

const defaultTemplates = [
  {
    title: 'Say Hello',
    shortcut: 'h',
    subject: '',
    tags: [],
    body: '<div>Hello {{to.first_name}},</div><div></div>'
  },
  {
    title: 'Nice talking to you',
    shortcut: 'nic',
    subject: '',
    tags: [],
    body: '<div>It was nice talking to you.</div>'
  },
  {
    title: 'Kind Regards',
    shortcut: 'kr',
    subject: '',
    tags: [],
    body: '<div>Kind regards,</div><div>{{from.first_name}}.</div>'
  },
  {
    title: 'My email',
    shortcut: 'e',
    subject: '',
    tags: [],
    body: '<div>{{from.email}}</div>'
  },
  {
    title: 'Custom',
    shortcut: 'c',
    subject: '',
    tags: [],
    body: '{{custom}}'
  },

  {
    title: 'Target partial',
    shortcut: 'template-john@briskine.com',
    body: 'template john',
  },
  {
    title: 'Subexpression partial',
    shortcut: 'subexpressionpartial',
    body: '{{> (text "template-" "concat" account.email)}}',
  },
]

describe('parseTemplate', async () => {
  beforeAll(() => {
    window.browser.runtime.sendMessage = async ({type}) => {
      if (type === 'getTemplates') {
        return defaultTemplates
      }

      if (type === 'getAccount') {
        return {
          email: 'john@briskine.com',
        }
      }

      return []
    }
  })

  it('should parse template without variables', async () => {
    expect(await parseTemplate('Hello\nBriskine')).to.equal('Hello\nBriskine')
  })

  it('should parse template with undefined variable', async () => {
    expect(await parseTemplate('Hello {{to.first_name}}')).to.equal('Hello ')
  })

  it('should parse template with variable', async () => {
    expect(await parseTemplate('Hello {{to.first_name}}', {to: {first_name: 'Briskine'}})).to.equal('Hello Briskine')
  })

  it('should parse template with variable under index', async () => {
    expect(await parseTemplate('Hello {{to.0.first_name}}', {to: {first_name: 'Briskine'}})).to.equal('Hello Briskine')
  })

  it('should loop to variable when array', async () => {
    expect(await parseTemplate('{{#each to}}{{@index}} {{this.first_name}}{{/each}}', {to: [{first_name: 'Briskine'}]})).to.equal('0 Briskine')
  })

  it('should print to.first_name when array', async () => {
    expect(await parseTemplate('{{to.first_name}}', {to: [{first_name: 'Briskine'}]})).to.equal('Briskine')
  })

  it('should print to.first_name when only name is provided', async () => {
    expect(await parseTemplate('{{to.first_name}}', {to: [{name: 'Briskine'}]})).to.equal('Briskine')
  })

  it('should print to.last_name when only name is provided', async () => {
    expect(await parseTemplate('{{to.last_name}}', {to: [{name: 'Briskine Last'}]})).to.equal('Last')
  })

  it('should print to variable at index from array value', async () => {
    expect(await parseTemplate('Hello {{to.0.first_name}}', {to: [{first_name: 'Briskine'}]})).to.equal('Hello Briskine')
  })

  it('should print from variable, when context not provided', async () => {
    expect(await parseTemplate('Hello {{from.first_name}}')).to.equal('Hello ')
  })

  it('should print from variable, when only account is provided', async () => {
    expect(await parseTemplate('Hello {{from.first_name}}', {account: {first_name: 'Briskine'}})).to.equal('Hello Briskine')
  })

  it('should print from variable, when from is provided', async () => {
    expect(await parseTemplate('Hello {{from.first_name}}', {from: {first_name: 'Briskine'}})).to.equal('Hello Briskine')
  })

  it('should print from variable, when both from and account are provided', async () => {
    expect(await parseTemplate('Hello {{from.first_name}}', {account: {first_name: 'Account'}, from: {first_name: 'From'}})).to.equal('Hello From')
  })

  it('should print from variable, when from and account are provided, but from is empty', async () => {
    expect(await parseTemplate('Hello {{from.first_name}}', {
      account: {first_name: 'Account'}, from: {first_name: ''}
    })).to.equal('Hello Account')
  })

  it('should print account variable, when both from and account are provided', async () => {
    expect(await parseTemplate('Hello {{account.first_name}}', {account: {first_name: 'Account'}, from: {first_name: 'From'}})).to.equal('Hello Account')
  })

  it('should return parsing error string from broken template', async () => {
    expect(await parseTemplate('Hello {{to.first_name}')).to.equal(`<pre>Parse error on line 1:
...ello {{to.first_name}
-----------------------^
Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'</pre>`)
  })

  it('should parse template with utf8 characters', async () => {
    expect(await parseTemplate('{{moment format="YYYY年 MMM Do" locale="ja"}}', {}, true)).to.equal(`${year}年 ${month}月 ${day}日`)
    expect(await compileTemplate('{{moment format="YYYY年 MMM Do" locale="ja"}}', {})).to.equal(`${year}年 ${month}月 ${day}日`)
  })

  it('should parse template with partial', async () => {
    expect(await parseTemplate('{{> kr}}', {from: {first_name:'Briskine'}})).to.equal('<div>Kind regards,</div><div>Briskine.</div>')
  })

  it('should parse template with partial with context', async () => {
    expect(await parseTemplate('{{> e custom}}', {custom: {from: {email:'contact@briskine.com'}}})).to.equal('<div>contact@briskine.com</div>')
  })

  it('should parse template with partial with parameter', async () => {
    expect(await parseTemplate('{{> c custom="briskine"}}')).to.equal('briskine')
  })

  it('should throw error when partial is not found', async () => {
    expect(await parseTemplate('{{> not_found}}')).to.equal('<pre>The partial not_found could not be found</pre>')
  })

  it('should throw error when helper is not found', async () => {
    expect(await parseTemplate('{{not_found true}}')).to.equal('<pre>Missing helper: "not_found"</pre>')
  })

  it('should parse template with account variable', async () => {
    expect(await parseTemplate('{{> (text "template-" "concat" account.email)}}')).to.equal('template john')
  })

  it('should parse template with nested partial that uses account variable', async () => {
    expect(await parseTemplate('{{> subexpressionpartial}}')).to.equal('template john')
  })

  afterAll(() => {
    destroy()
    delete window.browser.runtime.sendMessage
  })
})
