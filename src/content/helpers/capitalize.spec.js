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

describe('capitalize with values that are not strings', () => {
  it('should render nothing for a plain object', async () => {
    expect(await parseTemplate('[{{capitalize thing}}]', {thing: {name: 'john'}})).to.equal('[]')
  })

  it('should render nothing for a contact list', async () => {
    expect(await parseTemplate('[{{capitalize to}}]', {to: [{first_name: 'john'}]})).to.equal('[]')
  })

  it('should render a value that has its own toString', async () => {
    const renderable = []
    renderable.toString = () => 'john'
    expect(await parseTemplate('[{{capitalize thing}}]', {thing: renderable})).to.equal('[John]')
  })
})
