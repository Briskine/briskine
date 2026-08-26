import { expect, describe, it } from 'vitest'

import {
  templatesLimit,
  getTemplateSlotId,
  getTemplateSlot,
  getSlotTemplates,
  getSlotState,
} from './context-menu-slots.js'

describe('context-menu-slots', () => {
  it('should map a slot id back to its index', () => {
    expect(getTemplateSlot(getTemplateSlotId(0))).equal(0)
    expect(getTemplateSlot(getTemplateSlotId(7))).equal(7)
  })

  it('should not map ids that are not template slots', () => {
    expect(Number.isNaN(getTemplateSlot('insertTemplates'))).equal(true)
  })

  it('should limit the templates to the number of slots', () => {
    const templates = Array.from({length: templatesLimit + 10}, (item, index) => {
      return {id: `${index}`, title: `title-${index}`}
    })

    expect(getSlotTemplates(templates, 'title').length).equal(templatesLimit)
  })

  it('should sort the templates the same way every time', () => {
    const templates = [
      {id: '1', title: 'b'},
      {id: '2', title: 'a'},
    ]

    expect(getSlotTemplates(templates, 'title').map((t) => t.id)).to.deep.equal(['2', '1'])
    expect(getSlotTemplates(templates, 'title').map((t) => t.id)).to.deep.equal(['2', '1'])
  })

  it('should hide a slot without a template', () => {
    expect(getSlotState()).to.deep.equal({visible: false})
  })

  it('should show the template title and shortcut', () => {
    expect(getSlotState({title: 'hello'})).to.deep.equal({title: 'hello', visible: true})
    expect(getSlotState({title: 'hello', shortcut: 'h'})).to.deep.equal({title: 'hello (h)', visible: true})
  })
})
