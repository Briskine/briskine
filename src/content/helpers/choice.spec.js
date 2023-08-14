/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('choice handlebars helper', () => {
  it('should render only option', () => {
    expect(compileTemplate('{{choice "one"}}')).to.equal('one')
  })
})
