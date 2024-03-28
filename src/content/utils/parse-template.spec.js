/* globals describe, it, after, beforeEach */
import {expect} from 'chai'

import parseTemplate from './parse-template.js'
import {destroy} from '../sandbox/sandbox-parent.js'

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const day = now.getDate()

describe('parseTemplate', async () => {
  beforeEach(() => {
    // sandbox needs a second to respond
    return new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
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

  it('should print from variable at index from array value', async () => {
    expect(await parseTemplate('Hello {{to.0.first_name}}', {to: [{first_name: 'Briskine'}]})).to.equal('Hello Briskine')
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

  it('should print from variable, when from and account are provided, but from is epmty', async () => {
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
    expect(await parseTemplate('{{moment format="YYYY年 MMM Do" locale="ja"}}', {})).to.equal(`${year}年 ${month}月 ${day}日`)
  })

  after(destroy)
})
