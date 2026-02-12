import { expect, describe, it } from 'vitest'

import {compileTemplate} from '../sandbox/sandbox.js'

export const cursorMarker = '\u200B'

describe('cursor handlebars helper', () => {
  it('should render empty markers', async () => {
    expect(await compileTemplate('{{cursor}}')).to.equal(cursorMarker + cursorMarker)
  })

  it('should render placeholder with markers', async () => {
    expect(await compileTemplate('{{cursor placeholder="briskine"}}'))
      .to.equal(cursorMarker + 'briskine' + cursorMarker)
  })

  it('should render placeholder markers when used a block', async () => {
    expect(await compileTemplate('{{#cursor}}briskine{{/cursor}}'))
      .to.equal(cursorMarker + 'briskine' + cursorMarker)
  })

  it('should escape expressions in placeholder', async () => {
    expect(await compileTemplate('{{cursor placeholder="& > briskine"}}'))
      .to.equal(cursorMarker + '&amp; &gt; briskine' + cursorMarker)
  })

  it('should allow html when used a block', async () => {
    expect(await compileTemplate('{{#cursor}}<img src="#">block{{/cursor}}'))
      .to.equal(cursorMarker + '<img src="#">block' + cursorMarker)
  })
})
