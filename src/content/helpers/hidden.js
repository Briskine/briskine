/*
 * Hidden helper
 *
 * {{~#hidden}}Notes, or form fields that only control the template.{{/hidden~}}
 *
 * Shown in the form, never inserted.
 *
 */

export default function createHidden (mode = 'final') {
  return async function hidden (...args) {
    const options = args.pop()
    if (!options.fn) {
      throw new Error('Must pass a block to #hidden')
    }

    // always render, so form fields inside still register
    const content = await options.fn(this)
    return mode === 'form' ? content : ''
  }
}
