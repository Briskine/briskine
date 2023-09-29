/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('list handlebars helper', () => {
  it('should concat strings', () => {
    expect(compileTemplate('{{list "hello" "concat" "there" "briskine"}}')).to.equal('hello,there,briskine')
  })
  it('should join array', () => {
    expect(compileTemplate('{{list (text "hello,briskine" "split" ",") "join" "-"}}')).to.equal('hello-briskine')
  })
  it('should sort array', () => {
    expect(compileTemplate('{{list (text "3,2,1" "split" ",") "toSorted"}}')).to.equal('1,2,3')
  })
})
