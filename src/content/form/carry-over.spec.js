import { expect, describe, it } from 'vitest'

import carryOver from './carry-over.js'

// a field at site, rendered for the loop items in path, outermost first.
// the key stands in for the one the form helpers build from the same parts.
function field (site, ...path) {
  return {
    key: `${site}:${path.map(([id]) => id).join('/')}`,
    site,
    indexes: path.map(([, index]) => index).join(','),
  }
}

// a field in a loop over items, one record per item
function loop (site, items) {
  return items.map((id, index) => field(site, [id, index]))
}

describe('carryOver', () => {
  it('should not move anything when the items stay the same', () => {
    expect(carryOver(loop('a', ['x', 'y']), loop('a', ['x', 'y']))).to.deep.equal([])
  })

  it('should not move anything when an item is removed', () => {
    expect(carryOver(loop('a', ['x', 'y', 'z']), loop('a', ['x', 'z']))).to.deep.equal([])
  })

  it('should not move anything when an item is added at the end', () => {
    expect(carryOver(loop('a', ['x', 'y']), loop('a', ['x', 'y', 'z']))).to.deep.equal([])
  })

  it('should not move anything when items are reordered', () => {
    expect(carryOver(loop('a', ['x', 'y']), loop('a', ['y', 'x']))).to.deep.equal([])
  })

  it('should move the value of an edited item', () => {
    expect(carryOver(loop('a', ['Gm', 'Outlook']), loop('a', ['Gma', 'Outlook']))).to.deep.equal([
      ['a:Gm', 'a:Gma'],
    ])
  })

  it('should move the first value when two items are merged', () => {
    expect(carryOver(loop('a', ['x', 'y']), loop('a', ['xy']))).to.deep.equal([
      ['a:x', 'a:xy'],
    ])
  })

  it('should move values by position when the whole list changes', () => {
    expect(carryOver(loop('a', ['x', 'y']), loop('a', ['p', 'q']))).to.deep.equal([
      ['a:x', 'a:p'],
      ['a:y', 'a:q'],
    ])
  })

  it('should match every field in the loop separately', () => {
    const previous = [...loop('a', ['Gm']), ...loop('b', ['Gm'])]
    const current = [...loop('a', ['Gma']), ...loop('b', ['Gma'])]
    expect(carryOver(previous, current)).to.deep.equal([
      ['a:Gm', 'a:Gma'],
      ['b:Gm', 'b:Gma'],
    ])
  })

  it('should move the fields inside an edited outer item', () => {
    const previous = [field('a', ['Gm', 0], ['x', 0]), field('a', ['Gm', 0], ['y', 1]), field('a', ['Outlook', 1], ['x', 0])]
    const current = [field('a', ['Gma', 0], ['x', 0]), field('a', ['Gma', 0], ['y', 1]), field('a', ['Outlook', 1], ['x', 0])]
    expect(carryOver(previous, current)).to.deep.equal([
      ['a:Gm/x', 'a:Gma/x'],
      ['a:Gm/y', 'a:Gma/y'],
    ])
  })

  it('should move an edited inner item under an unchanged outer item', () => {
    const previous = [field('a', ['Gmail', 0], ['x', 0]), field('a', ['Outlook', 1], ['x', 0])]
    const current = [field('a', ['Gmail', 0], ['xy', 0]), field('a', ['Outlook', 1], ['x', 0])]
    expect(carryOver(previous, current)).to.deep.equal([
      ['a:Gmail/x', 'a:Gmail/xy'],
    ])
  })

  it('should ignore fields outside loops', () => {
    expect(carryOver([field('a')], [field('a')])).to.deep.equal([])
  })

  it('should ignore a site that is no longer rendered', () => {
    expect(carryOver(loop('a', ['x']), loop('b', ['y']))).to.deep.equal([])
  })
})
