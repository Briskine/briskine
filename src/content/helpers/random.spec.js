import { expect, describe, it, beforeAll, afterAll } from 'vitest'

import {compileTemplate} from '../sandbox/sandbox.js'

let originalRandom = window.Math.random

describe('random handlebars helper', () => {
  beforeAll(() => {
    // mock Math.random
    window.Math.random = function () {
      return 0.5
    }
  })

  it('should print last item', async () => {
    expect(await compileTemplate('{{random "one"}}')).to.equal('one')
  })

  it('should print second item', async () => {
    expect(await compileTemplate('{{random "one" "two" "three"}}')).to.equal('two')
  })

  it('should print last item', async () => {
    expect(await compileTemplate('{{random "one" 2}}')).to.equal('2')
  })

  afterAll(() => {
    window.Math.random = originalRandom
  })
})
