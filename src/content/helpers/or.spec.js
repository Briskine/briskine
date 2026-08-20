import { expect, describe, it } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

describe('or handlebars helper', () => {
  it('should print first item', async () => {
    expect(await parseTemplate('{{or "one" "two"}}')).to.equal('one')
  })
  it('should print empty string', async () => {
    expect(await parseTemplate('{{or false false false}}')).to.equal('')
  })
  it('should print second item', async () => {
    expect(await parseTemplate('{{or false "second" false}}')).to.equal('second')
  })
  it('should print third item', async () => {
    expect(await parseTemplate('{{or false false "third"}}')).to.equal('third')
  })
  it('should print last_name', async () => {
    expect(await parseTemplate('{{or first_name last_name}}', { last_name: 'Last Name' })).to.equal('Last Name')
  })
  it('should print conditional name', async () => {
    expect(await parseTemplate('{{#if (or first_name last_name)}}Some Name{{/if}}', { last_name: 'Last Name' })).to.equal('Some Name')
  })
  it('should print empty string', async () => {
    expect(await parseTemplate('{{#if (or first_name last_name)}}Some Name{{/if}}')).to.equal('')
  })
})
