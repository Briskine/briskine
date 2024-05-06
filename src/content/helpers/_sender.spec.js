/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe.only('_sender handlebars helper', () => {
  it('should print from full name', async () => {
    expect(await compileTemplate('{{_sender from account "from.name"}}', { from: { name: 'Full Name' } })).to.equal('Full Name')
  })
})
