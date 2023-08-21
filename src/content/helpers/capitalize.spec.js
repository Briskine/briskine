/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('capitalize handlebars helper', () => {
  it('should uppercase first letter of first word', () => {
    expect(compileTemplate('{{capitalize "hello briskine"}}')).to.equal('Hello briskine')
  })
})

describe('capitalizeAll handlebars helper', () => {
  it('should uppercase first letter of all words', () => {
    expect(compileTemplate('{{capitalizeAll "hello briskine"}}')).to.equal('Hello Briskine')
  })
})

