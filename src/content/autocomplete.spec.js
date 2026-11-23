import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../store/store-content.js', async (importOriginal) => ({
  ...await importOriginal(),
  getTemplates: vi.fn(async () => []),
  isFreePlan: vi.fn(async () => false),
  updateTemplateStats: vi.fn(),
}))

vi.mock('./plugin.js', () => ({
  getPluginData: vi.fn(async () => ({})),
  runPluginActions: vi.fn(),
}))

import { getPluginData } from './plugin.js'
import { setup, destroy } from './utils/active-element.js'
import autocomplete from './autocomplete.js'

const template = {
  body: 'It was nice talking to you.',
}

let editor = null
let button = null

function moveFocusToButton () {
  getPluginData.mockImplementationOnce(async () => {
    button.focus()
    return {}
  })
}

describe('autocomplete', () => {
  beforeEach(() => {
    setup()
    button = document.createElement('button')
    document.body.appendChild(button)
  })

  afterEach(() => {
    destroy()
    editor.remove()
    button.remove()
  })

  it('should insert at the caret in textarea, when the page moves focus', async () => {
    editor = document.createElement('textarea')
    document.body.appendChild(editor)
    editor.value = 'hello world'
    editor.focus()
    editor.setSelectionRange(6, 6)
    moveFocusToButton()

    await autocomplete({template})

    expect(editor.value).to.equal('hello It was nice talking to you.world')
    expect(document.activeElement).to.equal(editor)
  })

  it('should insert at the caret in contenteditable, when the page moves focus', async () => {
    editor = document.createElement('div')
    editor.contentEditable = 'true'
    editor.textContent = 'hello world'
    document.body.appendChild(editor)
    editor.focus()
    window.getSelection().setBaseAndExtent(editor.firstChild, 6, editor.firstChild, 6)
    moveFocusToButton()

    await autocomplete({template})

    expect(editor.textContent).to.equal('hello It was nice talking to you.world')
    expect(document.activeElement).to.equal(editor)
  })
})
