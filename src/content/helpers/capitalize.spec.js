import { expect, describe, it } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

describe('capitalize handlebars helper', () => {
  it('should uppercase first letter of first word', async () => {
    expect(await parseTemplate('{{capitalize "hello briskine"}}')).to.equal('Hello briskine')
  })
})

describe('capitalizeAll handlebars helper', () => {
  it('should uppercase first letter of all words', async () => {
    expect(await parseTemplate('{{capitalizeAll "hello briskine"}}')).to.equal('Hello Briskine')
  })
})
