import { expect, describe, it, afterEach } from 'vitest'

import { isExtensionElement, isBubbleElement, scopeTagName } from './extension-element.js'
import { dialogTagPrefix, bubbleTagPrefix } from '../../config.js'

const created = []

function create (tagName, parent = document.body) {
  const el = document.createElement(tagName)
  parent.appendChild(el)
  created.push(el)
  return el
}

afterEach(() => {
  created.forEach((el) => el.remove())
  created.length = 0
})

describe('isExtensionElement', () => {
  it('returns false for nothing', () => {
    expect(isExtensionElement(null)).toBe(false)
    expect(isExtensionElement(undefined)).toBe(false)
  })

  it('returns false for page elements', () => {
    expect(isExtensionElement(create('textarea'))).toBe(false)
    expect(isExtensionElement(document.body)).toBe(false)
  })

  it('matches the scoped dialog and bubble tag names', () => {
    expect(isExtensionElement(create('b-dialog-m1kq9wxz'))).toBe(true)
    expect(isExtensionElement(create('b-bubble-m1kq9wxz'))).toBe(true)
  })

  it('does not match tag names that only look similar', () => {
    expect(isExtensionElement(create('b-dialogue-thing'))).toBe(false)
    expect(isExtensionElement(create('my-b-dialog-wrapper'))).toBe(false)
  })

  it('matches nodes inside a shadow root', () => {
    const host = create('b-dialog-m1kq9wxz')
    const shadowRoot = host.attachShadow({mode: 'open'})
    shadowRoot.innerHTML = '<div><input></div>'

    expect(isExtensionElement(shadowRoot.querySelector('input'))).toBe(true)
  })

  it('matches nodes inside nested shadow roots', () => {
    const host = create('b-dialog-m1kq9wxz')
    const shadowRoot = host.attachShadow({mode: 'open'})
    const inner = document.createElement('div')
    shadowRoot.appendChild(inner)
    const innerShadowRoot = inner.attachShadow({mode: 'open'})
    innerShadowRoot.innerHTML = '<input>'

    expect(isExtensionElement(innerShadowRoot.querySelector('input'))).toBe(true)
  })

  it('does not match a page shadow root', () => {
    const host = create('div')
    const shadowRoot = host.attachShadow({mode: 'open'})
    shadowRoot.innerHTML = '<textarea></textarea>'

    expect(isExtensionElement(shadowRoot.querySelector('textarea'))).toBe(false)
  })
})

describe('isBubbleElement', () => {
  it('returns false for nothing', () => {
    expect(isBubbleElement(null)).toBe(false)
    expect(isBubbleElement(undefined)).toBe(false)
  })

  it('only matches the bubble, not the dialog', () => {
    expect(isBubbleElement(create('b-bubble-m1kq9wxz'))).toBe(true)
    expect(isBubbleElement(create('b-dialog-m1kq9wxz'))).toBe(false)
    expect(isBubbleElement(create('textarea'))).toBe(false)
  })

  it('matches the button inside the bubble shadow root', () => {
    const host = create('b-bubble-m1kq9wxz')
    const shadowRoot = host.attachShadow({mode: 'open'})
    shadowRoot.innerHTML = '<button><svg></svg></button>'

    expect(isBubbleElement(shadowRoot.querySelector('button'))).toBe(true)
    expect(isBubbleElement(shadowRoot.querySelector('svg'))).toBe(true)
  })
})

describe('the tag names the components register', () => {
  // the components build their tag names from the same config prefixes,
  // so this catches the matcher drifting away from them.
  it('are matched by isExtensionElement', () => {
    expect(isExtensionElement(create(scopeTagName(dialogTagPrefix)))).toBe(true)
    expect(isExtensionElement(create(scopeTagName(bubbleTagPrefix)))).toBe(true)
  })

  it('are told apart by isBubbleElement', () => {
    expect(isBubbleElement(create(scopeTagName(bubbleTagPrefix)))).toBe(true)
    expect(isBubbleElement(create(scopeTagName(dialogTagPrefix)))).toBe(false)
  })
})
