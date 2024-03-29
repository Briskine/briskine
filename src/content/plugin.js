/**
 * Plugin
 */

const plugins = []
export function register (plugin) {
  plugins.push(plugin)
}

// sequentially run promises until one returns true, or we reach the end
export async function run (params = {}, index = 0) {
  const plugin = plugins[index]
  if (!plugin) {
    return true
  }

  const done = await plugin(params)
  if (done === true) {
    return true
  }

  return run(params, index + 1)
}
