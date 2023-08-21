/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('string handlebars helpers', () => {
  it('should split string and render each item', () => {
    expect(compileTemplate('{{#each (split "john@briskine.com" "@")}}{{.}}\n{{/each}}')).to.equal('john\nbriskine.com\n')
  })
  it('should split string and render first item', () => {
    expect(compileTemplate('{{lookup (split "john@briskine.com" "@") 0}}')).to.equal('john')
  })
  it('should split string and render second item', () => {
    expect(compileTemplate('{{lookup (split "john@briskine.com" "@") 1}}')).to.equal('briskine.com')
  })
  it('should split string with subexpression and render second item', () => {
    expect(compileTemplate('{{lookup (split "john@briskine.com" "@") 1}}')).to.equal('briskine.com')
  })
})
