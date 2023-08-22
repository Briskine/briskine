/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('or handlebars helper', () => {
  it('should print first item', () => {
    expect(compileTemplate('{{or "one" "two"}}')).to.equal('one')
  })
  it('should print empty string', () => {
    expect(compileTemplate('{{or false false false}}')).to.equal('')
  })
  it('should print second item', () => {
    expect(compileTemplate('{{or false "second" false}}')).to.equal('second')
  })
  it('should print third item', () => {
    expect(compileTemplate('{{or false false "third"}}')).to.equal('third')
  })
  it('should print last_name', () => {
    expect(compileTemplate('{{or first_name last_name}}', { last_name: 'Last Name' })).to.equal('Last Name')
  })
  it('should print conditional name', () => {
    expect(compileTemplate('{{#if (or first_name last_name)}}Some Name{{/if}}', { last_name: 'Last Name' })).to.equal('Some Name')
  })
  it('should print empty string', () => {
    expect(compileTemplate('{{#if (or first_name last_name)}}Some Name{{/if}}')).to.equal('')
  })
})
