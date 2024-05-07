/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('_sender handlebars helpers', () => {
  it('should print from full name', async () => {
    expect(await compileTemplate('{{_from_name}}', { from: { name: 'First Last' } })).to.equal('First Last')
  })

  it('should print from last name', async () => {
    expect(await compileTemplate('{{_from_last_name}}', { from: { name: 'First Last' } })).to.equal('Last')
  })

  it('should print account first name', async () => {
    expect(await compileTemplate('{{_account_first_name}}', { account: { name: 'First Last' } })).to.equal('First')
  })
})
