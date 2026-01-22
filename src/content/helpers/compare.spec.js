import { expect, describe, it } from 'vitest'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('compare handlebars helper', () => {
  it('should compare two strings and print false', async () => {
    expect(await compileTemplate('{{compare "===" "one" "two"}}')).to.equal('false')
  })
  it('should compare two strings print true', async () => {
    expect(await compileTemplate('{{compare "===" "one" "one"}}')).to.equal('true')
  })
  it('should compare strings and print false with three arguments', async () => {
    expect(await compileTemplate('{{compare "===" "one" "one" "two"}}')).to.equal('false')
  })
  it('should compare strings print true with three arguments', async () => {
    expect(await compileTemplate('{{compare "===" "one" "one" "one"}}')).to.equal('true')
  })
  it('should compare string and number', async () => {
    expect(await compileTemplate('{{compare "==" "1" 1}}')).to.equal('true')
  })
  it('should compare greater than numbers', async () => {
    expect(await compileTemplate('{{compare ">" 2 1}}')).to.equal('true')
  })
  it('should compare not equal numbers', async () => {
    expect(await compileTemplate('{{compare "!=" 1 2}}')).to.equal('true')
  })
  it('should compare greater or equal numbers', async () => {
    expect(await compileTemplate('{{compare ">=" 2 1 2}}')).to.equal('true')
  })
})
