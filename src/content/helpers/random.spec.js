import { expect, describe, it, beforeAll, afterAll } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

let originalRandom = window.Math.random

describe('random handlebars helper', () => {
  beforeAll(() => {
    // mock Math.random
    window.Math.random = function () {
      return 0.5
    }
  })

  it('should print last item', async () => {
    expect(await parseTemplate('{{random "one"}}')).to.equal('one')
  })

  it('should print second item', async () => {
    expect(await parseTemplate('{{random "one" "two" "three"}}')).to.equal('two')
  })

  it('should print last item', async () => {
    expect(await parseTemplate('{{random "one" 2}}')).to.equal('2')
  })

  afterAll(() => {
    window.Math.random = originalRandom
  })
})
