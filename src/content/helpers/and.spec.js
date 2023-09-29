/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('and handlebars helper', () => {
  it('should print last item', () => {
    expect(compileTemplate('{{and "one" "two" "three"}}')).to.equal('three')
  })
  it('should print empty string', () => {
    expect(compileTemplate('{{and false false false}}')).to.equal('')
  })
  it('should print empty item', () => {
    expect(compileTemplate('{{and false "second" "third"}}')).to.equal('')
  })
  it('should print last_name', () => {
    expect(compileTemplate('{{and first_name last_name}}', { first_name: 'First Name', last_name: 'Last Name' })).to.equal('Last Name')
  })
  it('should print conditional name', () => {
    expect(compileTemplate('{{#if (and first_name last_name)}}Both Names{{/if}}', {
      first_name: 'First Name',
      last_name: 'Last Name',
    })).to.equal('Both Names')
  })
  it('should print empty string', () => {
    expect(compileTemplate('{{#if (and first_name last_name)}}Some Name{{/if}}', { first_name: 'First Name' })).to.equal('')
  })
})
