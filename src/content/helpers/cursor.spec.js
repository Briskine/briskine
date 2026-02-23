import { expect, describe, it } from 'vitest'

import { compileTemplate } from '../sandbox/sandbox.js'
import { cursorMarker } from '../cursors/cursors.js'

function cursor (placeholder = '') {
  return cursorMarker + placeholder + cursorMarker
}

describe('cursor handlebars helper', () => {
  it('should render empty markers', async () => {
    expect(await compileTemplate('{{cursor}}')).to.equal(cursor())
  })

  it('should render placeholder markers when used inline', async () => {
    expect(await compileTemplate('{{cursor "placeholder"}}'))
      .to.equal(cursor('placeholder'))
  })

  it('should escape special characters in placeholders when used inline', async () => {
    expect(await compileTemplate('{{cursor "& > placeholder"}}'))
      .to.equal(cursor('&amp; &gt; placeholder'))
  })

  it('should render placeholder markers', async () => {
    expect(await compileTemplate('{{#cursor}}placeholder{{/cursor}}'))
      .to.equal(cursor('placeholder'))
  })

  it('should support special characters in placeholder', async () => {
    expect(await compileTemplate('{{#cursor}}& > placeholder{{/cursor}}'))
      .to.equal(cursor('& > placeholder'))
  })

  it('should ignore the inline placeholder argument when used as a block', async () => {
    expect(await compileTemplate('{{#cursor "inline-placeholder"}}block-placeholder{{/cursor}}'))
      .to.equal(cursor('block-placeholder'))
  })

  it('should allow html', async () => {
    expect(await compileTemplate('{{#cursor}}<img src="#">block{{/cursor}}'))
      .to.equal(cursor('<img src="#">block'))
  })

  it('should support dynamic variables', async () => {
    expect(await compileTemplate('{{#cursor}}{{first_name}}{{/cursor}}', {first_name: 'placeholder'}))
      .to.equal(cursor('placeholder'))
  })

  it('should support loop with private handlebars expressions inside cursor', async () => {
    expect(await compileTemplate('{{#cursor}}{{#each list}}{{@index}} {{this}}{{/each}}{{/cursor}}', {list: ['placeholder']}))
      .to.equal(cursor('0 placeholder'))
  })

  it('should support cursor with expressions inside loop', async () => {
    expect(await compileTemplate('{{#each list}}{{#cursor}}{{@index}} {{this}} {{@root.first_name}}{{/cursor}}{{/each}}', {
      list: ['placeholder'],
      first_name: 'First'
    }))
      .to.equal(cursor('0 placeholder First'))
  })
})
