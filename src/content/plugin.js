/**
 * Plugin
 */

import { merge } from 'es-toolkit'

import plugins from './plugins/index.js'
import debug from '../debug.js'

function pluginFunctions (type) {
  return plugins
    .map((plugin) => plugin[type])
    .filter((func) => typeof func === 'function')
}

export async function getPluginData (params) {
  const responses = await Promise.allSettled(
    pluginFunctions('data').map((getData) => getData(params))
  )

  return responses
    .filter((response) => {
      if (response.status === 'rejected') {
        debug(['plugin', 'data', params, response.reason], 'error')
        return false
      }

      return true
    })
    .map((response) => response.value)
    .filter((data) => data != null)
    .reduce((result, data) => merge(result, data), {})
}

export async function runPluginActions (params) {
  for (const actions of pluginFunctions('actions')) {
    try {
      await actions(params)
    } catch (err) {
      debug(['plugin', 'actions', params, err], 'error')
    }
  }
}
