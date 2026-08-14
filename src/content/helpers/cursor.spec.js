import { expect, describe, it } from 'vitest'

import parseTemplate from '../utils/parse-template.js'
import { cursorMarker } from '../cursors/cursors.js'

function cursor (placeholder = '') {
  return cursorMarker + placeholder + cursorMarker
}

describe('cursor handlebars helper', () => {
  it('should render empty markers', async () => {
    expect(await parseTemplate('{{cursor}}')).to.equal(cursor())
  })

  it('should render placeholder markers when used inline', async () => {
    expect(await parseTemplate('{{cursor "placeholder"}}'))
      .to.equal(cursor('placeholder'))
  })

  it('should escape special characters in placeholders when used inline', async () => {
    expect(await parseTemplate('{{cursor "& > placeholder"}}'))
      .to.equal(cursor('&amp; &gt; placeholder'))
  })

  it('should render placeholder markers', async () => {
    expect(await parseTemplate('{{#cursor}}placeholder{{/cursor}}'))
      .to.equal(cursor('placeholder'))
  })

  it('should support special characters in placeholder', async () => {
    expect(await parseTemplate('{{#cursor}}& > placeholder{{/cursor}}'))
      .to.equal(cursor('& > placeholder'))
  })

  it('should ignore the inline placeholder argument when used as a block', async () => {
    expect(await parseTemplate('{{#cursor "inline-placeholder"}}block-placeholder{{/cursor}}'))
      .to.equal(cursor('block-placeholder'))
  })

  it('should allow html', async () => {
    expect(await parseTemplate('{{#cursor}}<img src="#">block{{/cursor}}'))
      .to.equal(cursor('<img src="#">block'))
  })

  it('should support dynamic variables', async () => {
    expect(await parseTemplate('{{#cursor}}{{first_name}}{{/cursor}}', {first_name: 'placeholder'}))
      .to.equal(cursor('placeholder'))
  })

  it('should support loop with private handlebars expressions inside cursor', async () => {
    expect(await parseTemplate('{{#cursor}}{{#each list}}{{@index}} {{this}}{{/each}}{{/cursor}}', {list: ['placeholder']}))
      .to.equal(cursor('0 placeholder'))
  })

  it('should support cursor with expressions inside loop', async () => {
    expect(await parseTemplate('{{#each list}}{{#cursor}}{{@index}} {{this}} {{@root.first_name}}{{/cursor}}{{/each}}', {
      list: ['placeholder'],
      first_name: 'First'
    }))
      .to.equal(cursor('0 placeholder First'))
  })
})
