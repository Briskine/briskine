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
