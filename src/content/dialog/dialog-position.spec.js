import { expect, describe, it, beforeEach, afterEach } from 'vitest'

import { getDialogPosition, getTargetRect } from './dialog-position.js'

const dialogWidth = 100
const dialogHeight = 50

let dialog = null
let target = null

beforeEach(() => {
  dialog = document.createElement('div')
  dialog.style.cssText = `position: fixed; top: 0; left: 0; width: ${dialogWidth}px; height: ${dialogHeight}px;`
  document.body.appendChild(dialog)
})

afterEach(() => {
  dialog.remove()
  target?.remove()
  target = null
})

function rect (top, left, width = 20, height = 10) {
  return {
    top,
    left,
    width,
    height,
  }
}

describe('getDialogPosition', () => {
  it('should place the dialog below the right edge of the target', () => {
    expect(getDialogPosition(rect(10, 10), dialog, 'bottom-right')).to.deep.equal({
      top: 20,
      left: 30,
    })
  })

  it('should flip to the left when there is no space on the right', () => {
    const left = window.innerWidth - 30
    expect(getDialogPosition(rect(10, left), dialog, 'bottom-right')).to.deep.equal({
      top: 20,
      left: left + 20 - dialogWidth,
    })
  })

  it('should flip above when there is no space below', () => {
    const top = window.innerHeight - 20
    expect(getDialogPosition(rect(top, 10), dialog, 'bottom-right').top).to.equal(top + 10 - dialogHeight)
  })

  it('should center the dialog without a target', () => {
    expect(getDialogPosition(null, dialog, 'bottom-right')).to.deep.equal({
      top: Math.max(0, (window.innerHeight - dialogHeight) / 2),
      left: Math.max(0, (window.innerWidth - dialogWidth) / 2),
    })
  })

  it('should center the dialog when the target is offscreen', () => {
    expect(getDialogPosition(rect(-100, 10), dialog, 'bottom-right')).to.deep.equal(getDialogPosition(null, dialog))
  })
})

describe('getTargetRect', () => {
  function element (style = '') {
    target = document.createElement('div')
    target.style.cssText = `position: fixed; width: 20px; height: 10px; ${style}`
    document.body.appendChild(target)
    return target
  }

  it('should return the rect of the target', () => {
    expect(getTargetRect(element('top: 5px; left: 15px;'))).to.deep.equal(rect(5, 15))
  })

  it('should return null when the target is offscreen', () => {
    expect(getTargetRect(element('top: -100px; left: 15px;'))).to.equal(null)
  })

  it('should return null without a target', () => {
    expect(getTargetRect(null)).to.equal(null)
  })
})
