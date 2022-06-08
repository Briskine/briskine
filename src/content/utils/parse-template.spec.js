/* globals describe, it, beforeAll, afterAll */
import {expect} from 'chai'

import parseTemplate from './parse-template.js'
import {setup, destroy} from '../sandbox/sandbox-parent.js'

describe('parseTemplate', () => {
  beforeAll(setup)

  it('should parse template without variables', () => {
    expect(parseTemplate('Hello\nBriskine')).to.equal('Hello\nBriskine')
  })

  it('should parse template with undefined variable', () => {
    expect(parseTemplate('Hello {{to.first_name}}')).to.equal('Hello ')
  })

  it('should parse template with variable', () => {
    expect(parseTemplate('Hello {{to.first_name}}', {to: {first_name: 'Briskine'}})).to.equal('Hello Briskine')
  })

  it('should return parsing error string from broken template', () => {
    expect(parseTemplate('Hello {{to.first_name}')).to.equal(`<pre>Parse error on line 1:
...ello {{to.first_name}
-----------------------^
Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'</pre>`)
  })

  afterAll(destroy)
})
