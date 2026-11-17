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
  it('should place the dialog below the anchor, starting at it', async () => {
    expect(await getDialogPosition(rect(10, 10, 0), dialog, 'bottom-start')).to.deep.equal({
      top: 20,
      left: 10,
    })
  })

  it('should place the dialog below the anchor, ending at it', async () => {
    expect(await getDialogPosition(rect(10, 200), dialog, 'bottom-end')).to.deep.equal({
      top: 20,
      left: 220 - dialogWidth,
    })
  })

  it('should start at the anchor on the right in rtl', async () => {
    dialog.setAttribute('dir', 'rtl')
    expect(await getDialogPosition(rect(10, 200, 0), dialog, 'bottom-start')).to.deep.equal({
      top: 20,
      left: 200 - dialogWidth,
    })
  })

  it('should end at the anchor when there is no space after it', async () => {
    const left = window.innerWidth - 30
    expect(await getDialogPosition(rect(10, left, 0), dialog, 'bottom-start')).to.deep.equal({
      top: 20,
      left: left - dialogWidth,
    })
  })

  it('should start at the anchor when there is no space before it', async () => {
    expect(await getDialogPosition(rect(10, 30, 0), dialog, 'bottom-end')).to.deep.equal({
      top: 20,
      left: 30,
    })
  })

  it('should flip above when there is no space below', async () => {
    const top = window.innerHeight - 20
    expect(await getDialogPosition(rect(top, 10, 0), dialog, 'bottom-start')).to.deep.equal({
      top: top - dialogHeight,
      left: 10,
    })
  })

  it('should center the dialog without a target', async () => {
    expect(await getDialogPosition(null, dialog, 'bottom-start')).to.deep.equal({
      top: Math.max(0, (window.innerHeight - dialogHeight) / 2),
      left: Math.max(0, (window.innerWidth - dialogWidth) / 2),
    })
  })

  it('should center the dialog when the target is offscreen', async () => {
    expect(await getDialogPosition(rect(-100, 10), dialog, 'bottom-start')).to.deep.equal(await getDialogPosition(null, dialog))
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
