/*
 * Hidden helper
 *
 * {{~#hidden}}Notes, or form fields that only control the template.{{/hidden~}}
 *
 * Shown in the form, never inserted.
 *
 */

import { hiddenAttribute } from '../../config.js'

export default function createHidden (mode = 'final') {
  return async function hidden (...args) {
    const options = args.pop()
    if (!options.fn) {
      throw new Error('Must pass a block to #hidden')
    }

    // always render, so form fields inside still register
    const content = await options.fn(this)
    if (mode !== 'form') {
      return ''
    }

    // markers instead of a wrapper, the block can start and end in different elements
    return `<span ${hiddenAttribute}="start"></span>${content}<span ${hiddenAttribute}="end"></span>`
  }
}
