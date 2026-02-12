/**
 * Plugin
 */

import merge from 'lodash.merge'

import debug from '../debug.js'

const plugins = new Map()

export function register (type = '', func = () => { }) {
  if (!plugins.has(type)) {
    plugins.set(type, new Set())
  }

  plugins.get(type).add(func)
}

export async function run (type = '', params) {
  if (type === 'data') {
    const promises = [...plugins.get(type)].map((f) => f(params))
    const responses = (await Promise.allSettled(promises))
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

  for (const func of plugins.get(type)) {
    try {
      await func(params)
    } catch (err) {
      debug(['plugin', type, params, err], 'error')
    }
  }
}
