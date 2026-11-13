import { expect, describe, it, beforeEach, afterEach } from 'vitest'

import { dialogTagPrefix } from '../../config.js'
import getShadowRoot from './shadow-root.js'
import getEventTarget from './event-target.js'
import { getActiveElement } from './active-element.js'
import { querySelectorDeep } from './selectors.js'
import { addFocusListeners } from './shadow-focus.js'

// the closed shadow roots, as only an extension can see them
const closedRoots = new WeakMap()

function createHost (tagName = 'div') {
  const host = document.createElement(tagName)
  const root = host.attachShadow({mode: 'closed'})
  closedRoots.set(host, root)
  root.innerHTML = '<textarea id="first"></textarea><textarea id="second"></textarea>'
  document.body.appendChild(host)
  return {
    host,
    root,
    first: root.querySelector('#first'),
    second: root.querySelector('#second'),
  }
}

describe('closed shadow roots', () => {
  let elements = null

  beforeEach(() => {
    window.chrome.dom = {
      openOrClosedShadowRoot: (element) => closedRoots.get(element) || null,
    }
    elements = createHost()
  })

  afterEach(() => {
    delete window.chrome.dom
    elements.host.remove()
  })

  it('should return the closed shadow root', () => {
    expect(getShadowRoot(elements.host)).to.equal(elements.root)
  })

  it('should not return the closed shadow root of our own ui', () => {
    const {host} = createHost(`${dialogTagPrefix}test`)
    expect(getShadowRoot(host)).to.equal(null)
    host.remove()
  })

  it('should not return the closed shadow root without the extension api', () => {
    delete window.chrome.dom
    expect(getShadowRoot(elements.host)).to.equal(null)
  })

  it('should return the open shadow root', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({mode: 'open'})
    expect(getShadowRoot(host)).to.equal(root)
  })

  it('should return the focused element in the closed shadow root', () => {
    elements.first.focus()
    expect(getActiveElement(true)).to.equal(elements.first)
  })

  it('should return the event target in the closed shadow root', async () => {
    const target = new Promise((resolve) => {
      window.addEventListener('focusin', (e) => resolve(getEventTarget(e)), {once: true})
    })
    elements.first.focus()
    expect(await target).to.equal(elements.first)
  })

  it('should find elements in the closed shadow root', () => {
    expect(querySelectorDeep('#second')).to.equal(elements.second)
  })

  it('should call the focus listener once, for focus in the closed shadow root', async () => {
    let focused = []
    const removeListeners = addFocusListeners((e) => focused.push(getEventTarget(e)), 'focusin')
    // the listeners report the active element after a tick
    await new Promise((resolve) => setTimeout(resolve))
    focused = []

    elements.first.focus()
    // focus moving inside the shadow root doesn't reach the window
    elements.second.focus()
    await new Promise((resolve) => setTimeout(resolve))
    removeListeners()

    expect(focused).to.deep.equal([elements.first, elements.second])
  })
})
