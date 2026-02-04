/**
 * Plugin
 */

import merge from 'lodash.merge'

import debug from '../debug.js'

const plugins = {}
export function register (type = '', func = () => { }) {
  if (!plugins[type]) {
    plugins[type] = []
  }

  plugins[type].push(func)
}

export async function run (type = '', params) {
  const responses = (await Promise.allSettled(plugins[type].map((f) => f(params))))
    .filter((r) => {
      if (r.status === 'rejected') {
        debug(['plugin', type, params, r.reason], 'error')
        return false
      }

      return true
    })
    .map((r) => r.value)

  const data = merge({}, ...responses)
  return data
}
