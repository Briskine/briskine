/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('or handlebars helper', () => {
  it('should print first item', async () => {
    expect(await compileTemplate('{{or "one" "two"}}')).to.equal('one')
  })
  it('should print empty string', async () => {
    expect(await compileTemplate('{{or false false false}}')).to.equal('')
  })
  it('should print second item', async () => {
    expect(await compileTemplate('{{or false "second" false}}')).to.equal('second')
  })
  it('should print third item', async () => {
    expect(await compileTemplate('{{or false false "third"}}')).to.equal('third')
  })
  it('should print last_name', async () => {
    expect(await compileTemplate('{{or first_name last_name}}', { last_name: 'Last Name' })).to.equal('Last Name')
  })
  it('should print conditional name', async () => {
    expect(await compileTemplate('{{#if (or first_name last_name)}}Some Name{{/if}}', { last_name: 'Last Name' })).to.equal('Some Name')
  })
  it('should print empty string', async () => {
    expect(await compileTemplate('{{#if (or first_name last_name)}}Some Name{{/if}}')).to.equal('')
  })
})
