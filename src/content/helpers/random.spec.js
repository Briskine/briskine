/* globals describe, it, before, after */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

let originalRandom = window.Math.random

describe('random handlebars helper', () => {
  before(() => {
    // mock Math.random
    window.Math.random = function () {
      return 0.5
    }
  })

  it('should print last item', () => {
    expect(compileTemplate('{{random "one"}}')).to.equal('one')
  })

  it('should print second item', () => {
    expect(compileTemplate('{{random "one" "two" "three"}}')).to.equal('two')
  })

  it('should print last item', () => {
    expect(compileTemplate('{{random "one" 2}}')).to.equal('2')
  })

  after(() => {
    window.Math.random = originalRandom
  })
})
