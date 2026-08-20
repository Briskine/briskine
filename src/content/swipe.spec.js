import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest'

import { swipebind, swipeunbind } from './swipe.js'

// TouchEvent can't be constructed in webkit or firefox,
// so we fake the properties swipe.js reads on a plain event.
function touchEvent (type, {x = 0, y = 0, time = 0, fingers = 1} = {}) {
  const event = new Event(type)
  const touch = {identifier: 0, clientX: x, clientY: y}

  Object.defineProperty(event, 'touches', {value: new Array(fingers).fill(touch)})
  Object.defineProperty(event, 'changedTouches', {value: [touch]})
  Object.defineProperty(event, 'timeStamp', {value: time})

  return event
}

function swipe (from, to) {
  window.dispatchEvent(touchEvent('touchstart', from))
  window.dispatchEvent(touchEvent('touchend', to))
}

describe('swipe', () => {
  let callback
  beforeEach(() => {
    callback = vi.fn()
    swipebind(callback)
  })

  afterEach(() => {
    swipeunbind()
  })

  it('should trigger on a horizontal swipe right', () => {
    swipe({x: 0, y: 0, time: 0}, {x: 100, y: 0, time: 200})

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should not trigger while scrolling vertically', () => {
    swipe({x: 0, y: 0, time: 0}, {x: 40, y: 100, time: 200})

    expect(callback).not.toHaveBeenCalled()
  })

  it('should not trigger on a slow drag', () => {
    swipe({x: 0, y: 0, time: 0}, {x: 50, y: 0, time: 500})

    expect(callback).not.toHaveBeenCalled()
  })

  it('should not trigger after unbinding', () => {
    swipeunbind()
    swipe({x: 0, y: 0, time: 0}, {x: 100, y: 0, time: 200})

    expect(callback).not.toHaveBeenCalled()
  })
})
