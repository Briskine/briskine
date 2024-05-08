/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('and handlebars helper', () => {
  it('should print last item', async () => {
    expect(await compileTemplate('{{and "one" "two" "three"}}')).to.equal('three')
  })
  it('should print empty string', async () => {
    expect(await compileTemplate('{{and false false false}}')).to.equal('')
  })
  it('should print empty item', async () => {
    expect(await compileTemplate('{{and false "second" "third"}}')).to.equal('')
  })
  it('should print last_name', async () => {
    expect(await compileTemplate('{{and first_name last_name}}', { first_name: 'First Name', last_name: 'Last Name' })).to.equal('Last Name')
  })
  it('should print conditional name', async () => {
    expect(await compileTemplate('{{#if (and first_name last_name)}}Both Names{{/if}}', {
      first_name: 'First Name',
      last_name: 'Last Name',
    })).to.equal('Both Names')
  })
  it('should print empty string', async () => {
    expect(await compileTemplate('{{#if (and first_name last_name)}}Some Name{{/if}}', { first_name: 'First Name' })).to.equal('')
  })
})
