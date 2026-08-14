import { expect, describe, it } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

describe('and handlebars helper', () => {
  it('should print last item', async () => {
    expect(await parseTemplate('{{and "one" "two" "three"}}')).to.equal('three')
  })
  it('should print empty string', async () => {
    expect(await parseTemplate('{{and false false false}}')).to.equal('')
  })
  it('should print empty item', async () => {
    expect(await parseTemplate('{{and false "second" "third"}}')).to.equal('')
  })
  it('should print last_name', async () => {
    expect(await parseTemplate('{{and first_name last_name}}', { first_name: 'First Name', last_name: 'Last Name' })).to.equal('Last Name')
  })
  it('should print conditional name', async () => {
    expect(await parseTemplate('{{#if (and first_name last_name)}}Both Names{{/if}}', {
      first_name: 'First Name',
      last_name: 'Last Name',
    })).to.equal('Both Names')
  })
  it('should print empty string', async () => {
    expect(await parseTemplate('{{#if (and first_name last_name)}}Some Name{{/if}}', { first_name: 'First Name' })).to.equal('')
  })
})
