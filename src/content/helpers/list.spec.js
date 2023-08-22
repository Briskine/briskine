/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('list handlebars helper', () => {
  it.only('should concat strings', () => {
    expect(compileTemplate('{{list "hello" "concat" "there" "briskine"}}')).to.equal('hello,there,briskine')
  })
})
