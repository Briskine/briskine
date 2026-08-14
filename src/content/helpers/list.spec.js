import { expect, describe, it } from 'vitest'

import parseTemplate from '../utils/parse-template.js'

describe('list handlebars helper', () => {
  it('should concat strings', async () => {
    expect(await parseTemplate('{{list "hello" "concat" "there" "briskine"}}')).to.equal('hello,there,briskine')
  })
  it('should join array', async () => {
    expect(await parseTemplate('{{list (text "hello,briskine" "split" ",") "join" "-"}}')).to.equal('hello-briskine')
  })
  it('should sort array', async () => {
    expect(await parseTemplate('{{list (text "3,2,1" "split" ",") "toSorted"}}')).to.equal('1,2,3')
  })
})
