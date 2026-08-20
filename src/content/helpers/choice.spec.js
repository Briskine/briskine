import { expect, describe, it } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

describe('choice handlebars helper', () => {
  it('should render only option', async () => {
    expect(await parseTemplate('{{choice "one"}}')).to.equal('one')
  })
})
