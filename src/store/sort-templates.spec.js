import { expect, describe, it } from 'vitest'

import sortTemplates from './sort-templates.js'

describe('sortTemplates', () => {
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

  it('should sort templates by shortcut', () => {
    expect(sortTemplates([
      {
        shortcut: 'sa',
      },
      {
        shortcut: 'sc',
      },
      {
        shortcut: 's1',
      },
      {
        shortcut: 'sb',
      },
    ], 'shortcut')).to.deep.equal([
      {
        shortcut: 's1',
      },
      {
        shortcut: 'sa',
      },
      {
        shortcut: 'sb',
      },
      {
        shortcut: 'sc',
      },
    ])
  })

})
