/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('domain handlebars helper', () => {
  it('should extract and capitalize domain name', async () => {
    expect(await compileTemplate('{{domain "contact@AWESOME-sweet-bakery.co.uk"}}')).to.equal('Awesome Sweet Bakery')
  })
})
