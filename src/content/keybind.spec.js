import {describe, it, expect, afterEach} from 'vitest'
import {userEvent} from 'vitest/browser'

import {keybind, destroy} from './keybind.js'

function textarea () {
  const element = document.createElement('textarea')
  document.body.appendChild(element)
  element.focus()
  return element
}

afterEach(() => {
  destroy()
  document.body.innerHTML = ''
})

describe('keybind', () => {
  it('should run the callback for a typed shortcut', async () => {
    const calls = []
    keybind('ctrl+space', () => calls.push('called'))
    textarea()

    await userEvent.keyboard('{Control>} {/Control}')

    expect(calls).to.deep.equal(['called'])
  })

  it('should not run the callback for a dispatched shortcut', () => {
    const calls = []
    keybind('ctrl+space', () => calls.push('called'))
    const element = textarea()

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      ctrlKey: true,
      bubbles: true,
      composed: true,
    })
    // not every browser takes keyCode in the constructor
    Object.defineProperty(event, 'keyCode', {value: 32})
    Object.defineProperty(event, 'which', {value: 32})
    element.dispatchEvent(event)

    expect(calls).to.deep.equal([])
  })
})
