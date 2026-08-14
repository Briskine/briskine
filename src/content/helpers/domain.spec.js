import { expect, describe, it } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

describe('domain handlebars helper', () => {
  it('should extract and capitalize domain name', async () => {
    expect(await parseTemplate('{{domain "contact@AWESOME-sweet-bakery.co.uk"}}')).to.equal('Awesome Sweet Bakery')
  })
})
