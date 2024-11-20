import {SafeString} from 'handlebars'

const asyncHelperAttr = 'data-briskine-async-helper'

let actions = []

export async function resolveAsyncHelpers (template = '') {
  const results = await Promise.allSettled(
      actions.map((a) => {
        return a.fn.call(a.self, ...a.args)
      })
    )
  const dom = new DOMParser().parseFromString(template, 'text/html')
  Array.from(dom.querySelectorAll(`[${asyncHelperAttr}]`)).forEach((node, index) => {
    node.replaceWith(results[index].value || results[index].reason || '')
  })

  actions = []

  return dom.body.innerHTML
}

export function helper (fn = () => {}) {
  return function () {
    actions.push({
      fn: fn,
      self: this,
      args: arguments,
    })

    return new SafeString(`<div ${asyncHelperAttr}>123</div>`)
  }
}
