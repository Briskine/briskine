/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('_sender handlebars helper', () => {
  it('should print from full name', async () => {
    expect(await compileTemplate('{{_sender from account path}}', { from: { name: 'Full Name' }, path: 'from.name' })).to.equal('Full Name')
  })
})
