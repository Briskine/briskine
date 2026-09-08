/**
 * Plugin
 */

import { merge } from 'es-toolkit'

import plugins from './plugins/index.js'
import debug from '../debug.js'

export async function run (type = '', params) {
  const funcs = plugins
    .map((plugin) => plugin[type])
    .filter((func) => typeof func === 'function')

  if (type === 'data') {
    const promises = funcs.map((f) => f(params))
    const responses = (await Promise.allSettled(promises))
      .filter((r) => {
        if (r.status === 'rejected') {
          debug(['plugin', type, params, r.reason], 'error')
          return false
        }

        return true
      })
      .map((r) => r.value)

    const data = responses
      .filter((response) => response != null)
      .reduce((result, response) => merge(result, response), {})
    return data
  }

  for (const func of funcs) {
    try {
      await func(params)
    } catch (err) {
      debug(['plugin', type, params, err], 'error')
    }
  }
}
