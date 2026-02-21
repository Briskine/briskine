import { expect, describe, it } from 'vitest'

import {compileTemplate} from '../sandbox/sandbox.js'

export const cursorMarker = '\u200B'

describe('cursor handlebars helper', () => {
  it('should render empty markers', async () => {
    expect(await compileTemplate('{{cursor}}')).to.equal(cursorMarker + cursorMarker)
  })

  it('should render placeholder markers', async () => {
    expect(await compileTemplate('{{#cursor}}briskine{{/cursor}}'))
      .to.equal(cursorMarker + 'briskine' + cursorMarker)
  })

  it('should support special characters in placeholder', async () => {
    expect(await compileTemplate('{{#cursor}}& > briskine{{/cursor}}'))
      .to.equal(cursorMarker + '& > briskine' + cursorMarker)
  })

  it('should allow html', async () => {
    expect(await compileTemplate('{{#cursor}}<img src="#">block{{/cursor}}'))
      .to.equal(cursorMarker + '<img src="#">block' + cursorMarker)
  })

  it('should support dynamic variables', async () => {
    expect(await compileTemplate('{{#cursor}}{{first_name}}{{/cursor}}', {first_name: 'Briskine'}))
      .to.equal(cursorMarker + 'Briskine' + cursorMarker)
  })

  it('should support loop with private handlebars expressions inside cursor', async () => {
    expect(await compileTemplate('{{#cursor}}{{#each list}}{{@index}} {{this}}{{/each}}{{/cursor}}', {list: ['Briskine']}))
      .to.equal(cursorMarker + '0 Briskine' + cursorMarker)
  })

  it('should support cursor with expressions inside loop', async () => {
    expect(await compileTemplate('{{#each list}}{{#cursor}}{{@index}} {{this}} {{@root.first_name}}{{/cursor}}{{/each}}', {
      list: ['Briskine'],
      first_name: 'First'
    }))
      .to.equal(cursorMarker + '0 Briskine First' + cursorMarker)
  })
})
