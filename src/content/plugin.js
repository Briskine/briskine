/**
 * Plugin
 */

var plugins = []
export function register (plugin) {
  plugins.push(plugin)
}

// sequentially run promises until one returns true, or we reach the end
export async function run (params = {}, index = 0) {
  var plugin = plugins[index]
  if (!plugin) {
    return true
  }

  const done = await Promise.resolve().then(() => plugin(params))
  if (done === true) {
    return true
  }

  return run(params, index + 1)
}

