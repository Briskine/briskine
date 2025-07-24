/* globals describe, it */
import {expect} from 'chai'
import {parse} from 'handlebars'

import templateFeatures from './template-features.js'

describe('templateFeatures', () => {
  it('should not find any features', () => {
    const template = parse(`
      <div>
        {{ to.first_name }}
      </div>
      {{#each}}variable={{variable}}{{/each}}
    `)
    expect(templateFeatures(template)).to.deep.equal({
      partials: false,
    })
  })

  it('should find partials', () => {
    const template = parse(`
      {{> partial }}
    `)
    expect(templateFeatures(template)).to.include({partials: true})
  })
})
