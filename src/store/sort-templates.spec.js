/* globals describe, it */
import {expect} from 'chai'

import sortTemplates from './sort-templates.js'

describe.only('sortTemplates', () => {
  it('should sort templates by title', () => {
    expect(sortTemplates([
      {
        title: 'Title B',
      },
      {
        title: 'Title A',
      },
      {
        title: 'Title C',
      },
    ], 'title')).to.deep.equal([
      {
        title: 'Title A',
      },
      {
        title: 'Title B',
      },
      {
        title: 'Title C',
      },
    ])
  })

  it('should use natural sort when titles contain numbers', () => {
    expect(sortTemplates([
      {
        title: 'Title 1',
      },
      {
        title: 'Title 12',
      },
      {
        title: 'Title 2',
      },
    ], 'title')).to.deep.equal([
      {
        title: 'Title 1',
      },
      {
        title: 'Title 2',
      },
      {
        title: 'Title 12',
      },
    ])
  })
})
